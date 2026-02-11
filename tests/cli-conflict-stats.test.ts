import { describe, expect, it, vi } from 'vitest'
import ConflictList from '../src/cli/commands/conflict/list.js'
import ConflictResolve from '../src/cli/commands/conflict/resolve.js'
import ScreenSplit from '../src/cli/commands/screen/split.js'
import Stats from '../src/cli/commands/stats.js'

const conflictState: { conflicts: any[] } = {
  conflicts: [{ id: 'c1', filePath: '/a', agents: ['a1'], detectedAt: new Date(), resolved: false }]
}

vi.mock('../src/state/conflict-manager.js', () => ({
  ConflictManager: class {
    listConflicts = vi.fn(() => conflictState.conflicts)
    resolve = vi.fn()
  }
}))

describe('CLI conflict/screen split/stats', () => {
  it('conflict list prints', async () => {
    const cmd = new ConflictList([], {} as any)
    const out: string[] = []
    ;(cmd as any).log = (s: string) => out.push(s)
    await cmd.run()
    expect(out.join('\n')).toContain('c1')
  })

  it('conflict list prints empty message when none', async () => {
    conflictState.conflicts = []
    const cmd = new ConflictList([], {} as any)
    const out: string[] = []
    ;(cmd as any).log = (s: string) => out.push(s)
    await cmd.run()
    expect(out.join('\n')).toContain('No conflicts')
    conflictState.conflicts = [{ id: 'c1', filePath: '/a', agents: ['a1'], detectedAt: new Date(), resolved: false }]
  })

  it('conflict resolve marks resolved', async () => {
    const cmd = new ConflictResolve([], {} as any)
    ;(cmd as any).parse = vi.fn(async () => ({ flags: { id: 'c1', by: 'a1', type: 'manual' } }))
    ;(cmd as any).log = vi.fn()
    await cmd.run()
    expect((cmd as any).log).toHaveBeenCalled()
  })

  it('screen split calls tmux', async () => {
    const tmux = { splitSessionName: vi.fn(async () => undefined) }
    const cmd = new ScreenSplit([], {} as any)
    ;(cmd as any).parse = vi.fn(async () => ({ flags: { session: 'sess', direction: 'horizontal' } }))
    ;(cmd as any).getTmuxManager = vi.fn(() => tmux)
    ;(cmd as any).log = vi.fn()
    await cmd.run()
    expect(tmux.splitSessionName).toHaveBeenCalledWith('sess', 'horizontal')
  })

  it('stats prints metrics', async () => {
    const store = { list: vi.fn(() => [{ state: 'running' }, { state: 'idle' }]) }
    const cmd = new Stats([], {} as any)
    ;(cmd as any).getAgentStore = vi.fn(() => store)
    ;(cmd as any).log = vi.fn()
    await cmd.run()
    expect((cmd as any).log).toHaveBeenCalled()
  })
})
