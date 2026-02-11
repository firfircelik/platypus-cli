import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/state/agent-task-store.js', () => ({
  AgentTaskStore: class {
    called = 0
    nextPending() {
      if (this.called++ === 0) process.emit('SIGINT')
      return null
    }
    setStatus = vi.fn()
    setResult = vi.fn()
  }
}))

vi.mock('../src/engine/chat-session.js', () => ({
  createChatSession: vi.fn(async () => ({
    handleUserMessageStream: vi.fn(async () => ''),
    handleUserMessage: vi.fn(async () => '')
  }))
}))

import { runAgentRuntime } from '../src/agent/agent-runtime.js'

describe('agent runtime idle', () => {
  it('loops and exits on SIGINT', async () => {
    vi.useFakeTimers()
    const p = runAgentRuntime(['node', '/tmp/agent-runtime.js', '--agentId', 'a1'])
    await vi.advanceTimersByTimeAsync(500)
    await p
    vi.useRealTimers()
    expect(true).toBe(true)
  })
})
