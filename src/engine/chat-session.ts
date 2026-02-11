import { Workspace } from '../core/workspace.js'
import type { ToolApprovalPrompt } from './tooling.js'
import { createDefaultApprovalPrompt, createToolRegistry } from './tooling.js'
import { createLlmClient } from '../llm/index.js'
import type { LlmClient } from '../llm/client.js'
import type { LlmMessage } from '../llm/types.js'

export type CreateChatSessionInput = {
  provider: string
  model?: string
  root: string
  autoApprove: boolean
  mode?: 'plan' | 'build'
  allowedTools?: string[]
}

export type ChatSession = {
  handleUserMessage(text: string): Promise<string>
  handleUserMessageStream(text: string, onText: (delta: string) => void): Promise<string>
  runTool(name: string, args: Record<string, unknown>): Promise<string>
  configure(next: { provider?: string; model?: string; root?: string; mode?: 'plan' | 'build' }): Promise<void>
  getConfig(): { provider: string; model?: string; root: string; mode: 'plan' | 'build' }
}

export async function createChatSession(input: CreateChatSessionInput): Promise<ChatSession> {
  let cfg: { provider: string; model?: string; root: string; autoApprove: boolean; mode: 'plan' | 'build'; allowedTools?: string[] } = {
    provider: input.provider,
    model: input.model,
    root: input.root,
    autoApprove: input.autoApprove,
    mode: input.mode ?? 'build',
    allowedTools: input.allowedTools
  }

  let llm: LlmClient
  let workspace: Workspace
  let tools: ReturnType<typeof createToolRegistry>
  let approval: ToolApprovalPrompt

  const messages: LlmMessage[] = []

  const modeToolAllowlist = (mode: 'plan' | 'build'): string[] | undefined => {
    if (cfg.allowedTools) return cfg.allowedTools
    if (mode === 'plan') return ['read_file', 'read_json', 'list_files', 'search_files', 'show_writes', 'run_command']
    return undefined
  }

  const rebuild = async () => {
    llm = await createLlmClient({ provider: cfg.provider, model: cfg.model })
    workspace = new Workspace(cfg.root)
    const effectiveAutoApprove = cfg.mode === 'plan' ? false : cfg.autoApprove
    approval = createDefaultApprovalPrompt({ autoApprove: effectiveAutoApprove })
    tools = createToolRegistry({ workspace, approval, agentId: 'chat', allowedToolNames: modeToolAllowlist(cfg.mode) })
  }

  await rebuild()

  return {
    async handleUserMessage(text: string): Promise<string> {
      messages.push({ role: 'user', content: text })
      const result = await llm.generateWithTools({
        messages,
        tools
      })
      messages.push(...result.newMessages)
      return result.outputText
    },
    async handleUserMessageStream(text: string, onText: (delta: string) => void): Promise<string> {
      messages.push({ role: 'user', content: text })
      if (llm.streamWithTools) {
        const result = await llm.streamWithTools({
          messages,
          tools,
          onText
        })
        messages.push(...result.newMessages)
        return result.outputText
      }
      const result = await llm.generateWithTools({ messages, tools })
      messages.push(...result.newMessages)
      onText(result.outputText)
      return result.outputText
    },
    async runTool(name: string, args: Record<string, unknown>): Promise<string> {
      return tools.execute({ id: 'repl', name, arguments: args })
    },
    async configure(next: { provider?: string; model?: string; root?: string; mode?: 'plan' | 'build' }): Promise<void> {
      cfg = {
        provider: next.provider ?? cfg.provider,
        model: next.model === undefined ? cfg.model : next.model,
        root: next.root ?? cfg.root,
        autoApprove: cfg.autoApprove,
        mode: next.mode ?? cfg.mode,
        allowedTools: cfg.allowedTools
      }
      await rebuild()
    },
    getConfig(): { provider: string; model?: string; root: string; mode: 'plan' | 'build' } {
      return { provider: cfg.provider, model: cfg.model, root: cfg.root, mode: cfg.mode }
    }
  }
}
