import { describe, expect, it, vi } from 'vitest'

let getCalls = 0

vi.mock('../src/state/agent-task-store.js', () => ({
  AgentTaskStore: class {
    enqueue() {
      return { id: 't1', agentId: 'a1', description: 'x', status: 'pending', createdAt: new Date(), updatedAt: new Date() }
    }
    get() {
      const status = getCalls++ < 2 ? 'pending' : 'done'
      return { id: 't1', agentId: 'a1', description: 'x', status, createdAt: new Date(), updatedAt: new Date() }
    }
    getResult() {
      return { taskId: 't1', agentId: 'a1', status: 'done', output: 'ok', updatedAt: new Date() }
    }
  }
}))

import Run from '../src/cli/commands/run.js'

describe('CLI run follow', () => {
  it('streams results while waiting', async () => {
    getCalls = 0
    vi.useFakeTimers()
    const cmd = new Run([], {} as any)
    ;(cmd as any).parse = vi.fn(async () => ({ args: { task: 'do' }, flags: { ensureTeam: false, wait: 1, follow: true } }))
    ;(cmd as any).getAgentStore = vi.fn(() => ({ list: () => [{ id: 'a1', sessionName: 's1' }] }))
    ;(cmd as any).getOrchestrator = vi.fn(() => ({
      assignTask: vi.fn(async (t: any) => [{ agentId: 'a1', task: { ...t, description: t.description } }]),
      broadcast: vi.fn(async () => undefined)
    }))
    ;(cmd as any).getTmuxManager = vi.fn(() => ({ sendCommandToSession: vi.fn(async () => undefined) }))
    ;(cmd as any).log = vi.fn()
    const p = cmd.run()
    await vi.advanceTimersByTimeAsync(1500)
    await p
    vi.useRealTimers()
    const text = (cmd as any).log.mock.calls.map((c: any[]) => c.join(' ')).join('\n')
    expect(text).toContain('t1')
    expect(text).toContain('ok')
  })
})

