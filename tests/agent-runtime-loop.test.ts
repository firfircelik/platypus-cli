import { describe, expect, it, vi } from 'vitest'

const state: { called: number } = { called: 0 }

vi.mock('../src/state/agent-task-store.js', () => ({
  AgentTaskStore: class {
    nextPending() {
      if (state.called++ === 0) return { id: 't1', agentId: 'a1', description: 'hello' }
      return null
    }
    setStatus = vi.fn()
    setResult = vi.fn()
  }
}))

vi.mock('../src/engine/chat-session.js', () => ({
  createChatSession: vi.fn(async () => ({
    handleUserMessageStream: vi.fn(async (_t: string, onText: (d: string) => void) => {
      onText('done')
      process.emit('SIGINT')
      return 'done'
    }),
    handleUserMessage: vi.fn(async () => 'done')
  }))
}))

import { runAgentRuntime } from '../src/agent/agent-runtime.js'

describe('agent runtime loop', () => {
  it('processes one task then exits on SIGINT', async () => {
    await runAgentRuntime(['node', '/tmp/agent-runtime.js', '--agentId', 'a1', '--autoApprove'])
    expect(state.called).toBeGreaterThan(0)
  })
})
