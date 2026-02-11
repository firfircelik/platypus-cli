import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { AgentTaskStore } from '../state/agent-task-store.js'
import { createChatSession } from '../engine/chat-session.js'

export type AgentRuntimeArgs = {
  agentId: string
  provider: string
  model?: string
  root: string
  autoApprove: boolean
  mode: 'plan' | 'build'
}

export function parseAgentRuntimeArgs(argv: string[]): AgentRuntimeArgs {
  const args: Record<string, string> = {}
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const k = a.slice(2)
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true'
      args[k] = v
    }
  }
  const agentId = args.agentId || args.agent || ''
  if (!agentId) throw new Error('Missing --agentId')
  return {
    agentId,
    provider: (args.provider || 'openai').toLowerCase(),
    model: args.model,
    root: args.root || process.cwd(),
    autoApprove: args.autoApprove === 'true' || args.autoApprove === '1',
    mode: args.mode === 'plan' ? 'plan' : 'build'
  }
}

export async function runAgentRuntime(argv: string[] = process.argv): Promise<void> {
  const a = parseAgentRuntimeArgs(argv)
  process.stdout.write(`platypus agent runtime started: ${a.agentId}\n`)

  const session = await createChatSession({
    provider: a.provider,
    model: a.model,
    root: a.root,
    autoApprove: a.autoApprove,
    mode: a.mode
  })

  const store = new AgentTaskStore()
  let running = true

  process.on('SIGINT', () => {
    running = false
  })
  process.on('SIGTERM', () => {
    running = false
  })

  while (running) {
    const task = store.nextPending(a.agentId)
    if (!task) {
      await sleep(500)
      continue
    }
    store.setStatus(task.id, 'running')
    try {
      process.stdout.write(`\nTask: ${task.description}\n`)
      let streamed = ''
      const out = await session.handleUserMessageStream(task.description, delta => {
        streamed += delta
        process.stdout.write(delta)
      })
      process.stdout.write('\n')
      store.setStatus(task.id, 'done')
      store.setResult(task.id, a.agentId, 'done', out.trim().length > 0 ? out : streamed)
    } catch (error) {
      process.stdout.write(`Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
      store.setStatus(task.id, 'failed')
      store.setResult(task.id, a.agentId, 'failed', error instanceof Error ? error.message : 'Unknown error')
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : ''
const self = fileURLToPath(import.meta.url)
if (entry && self === entry) {
  void runAgentRuntime()
}
