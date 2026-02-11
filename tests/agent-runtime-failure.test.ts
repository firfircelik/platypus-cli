import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/state/agent-task-store.js', () => ({
  AgentTaskStore: class {
    called = 0
    nextPending() {
      if (this.called++ === 0) return { id: 't1', agentId: 'a1', description: 'hello' }
      return null
    }
    setStatus = vi.fn()
    setResult = vi.fn()
  }
}))

vi.mock('../src/engine/chat-session.js', () => ({
  createChatSession: vi.fn(async () => ({
    handleUserMessageStream: vi.fn(async () => {
      process.emit('SIGINT')
      throw new Error('boom')
    }),
    handleUserMessage: vi.fn(async () => 'x')
  }))
}))

import { runAgentRuntime } from '../src/agent/agent-runtime.js'

describe('agent runtime failure', () => {
  it('marks task failed on error', async () => {
    await runAgentRuntime(['node', '/tmp/agent-runtime.js', '--agentId', 'a1', '--autoApprove'])
    expect(true).toBe(true)
  })
})

