import { describe, expect, it, vi } from 'vitest'
import AgentCreate from '../src/cli/commands/agent/create.js'
import AgentList from '../src/cli/commands/agent/list.js'
import AgentStart from '../src/cli/commands/agent/start.js'
import AgentStop from '../src/cli/commands/agent/stop.js'
import AgentDestroy from '../src/cli/commands/agent/destroy.js'
import AgentSpawnTeam from '../src/cli/commands/agent/spawn-team.js'
import ScreenList from '../src/cli/commands/screen/list.js'
import ScreenAttach from '../src/cli/commands/screen/attach.js'
import ScreenLayout from '../src/cli/commands/screen/layout.js'
import Run from '../src/cli/commands/run.js'
import { AgentRole, AgentState } from '../src/types/agent.types.js'

describe('CLI agent/screen/run commands', () => {
  it('agent create calls factory', async () => {
    const factory = { createAgent: vi.fn(async () => ({ id: 'a1', role: AgentRole.BACKEND_DEVELOPER, sessionName: 'sess' })) }
    const cmd = new AgentCreate([], {} as any)
    ;(cmd as any).parse = vi.fn(async () => ({ flags: { name: 'x', role: AgentRole.BACKEND_DEVELOPER, capabilities: [], layout: 'dev' } }))
    ;(cmd as any).getAgentFactory = vi.fn(() => factory)
    ;(cmd as any).log = vi.fn()
    await cmd.run()
    expect(factory.createAgent).toHaveBeenCalled()
  })

  it('agent list reads store', async () => {
    const store = { list: vi.fn(() => [{ id: 'a1', name: 'n', role: 'pm', state: 'idle', sessionName: 's' }]) }
    const cmd = new AgentList([], {} as any)
    ;(cmd as any).getAgentStore = vi.fn(() => store)
    const out: string[] = []
    ;(cmd as any).log = (s: string) => out.push(s)
    await cmd.run()
    expect(out.join('\n')).toContain('a1')
  })

  it('agent list prints empty message when none exist', async () => {
    const store = { list: vi.fn(() => []) }
    const cmd = new AgentList([], {} as any)
    ;(cmd as any).getAgentStore = vi.fn(() => store)
    const out: string[] = []
    ;(cmd as any).log = (s: string) => out.push(s)
    await cmd.run()
    expect(out.join('\n')).toContain('No agents')
  })

  it('agent start updates store and can attach', async () => {
    const agent = {
      id: 'a1',
      name: 'n',
      role: AgentRole.PROJECT_MANAGER,
      capabilities: [],
      sessionId: 'sid',
      sessionName: 'sess',
      paneId: 'pid',
      state: AgentState.IDLE,
      context: {} as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActivity: new Date()
    }
    const store = { get: vi.fn(() => agent), upsert: vi.fn() }
    const tmux = { attachSessionName: vi.fn(async () => undefined) }
    const audit = { write: vi.fn() }
    const cmd = new AgentStart([], {} as any)
    ;(cmd as any).parse = vi.fn(async () => ({ flags: { id: 'a1', attach: true } }))
    ;(cmd as any).getAgentStore = vi.fn(() => store)
    ;(cmd as any).getTmuxManager = vi.fn(() => tmux)
    ;(cmd as any).getAudit = vi.fn(() => audit)
    ;(cmd as any).log = vi.fn()
    await cmd.run()
    expect(store.upsert).toHaveBeenCalled()
    expect(tmux.attachSessionName).toHaveBeenCalledWith('sess')
  })

  it('agent stop updates store', async () => {
    const agent = { id: 'a1', sessionName: 'sess', state: AgentState.RUNNING, updatedAt: new Date() }
    const store = { get: vi.fn(() => agent), upsert: vi.fn() }
    const audit = { write: vi.fn() }
    const cmd = new AgentStop([], {} as any)
    ;(cmd as any).parse = vi.fn(async () => ({ flags: { id: 'a1' } }))
    ;(cmd as any).getAgentStore = vi.fn(() => store)
    ;(cmd as any).getAudit = vi.fn(() => audit)
    ;(cmd as any).log = vi.fn()
    await cmd.run()
    expect(store.upsert).toHaveBeenCalled()
  })

  it('agent destroy kills session and deletes record', async () => {
    const agent = { id: 'a1', sessionName: 'sess' }
    const store = { get: vi.fn(() => agent), delete: vi.fn() }
    const tmux = { killSessionName: vi.fn(async () => undefined) }
    const audit = { write: vi.fn() }
    const cmd = new AgentDestroy([], {} as any)
    ;(cmd as any).parse = vi.fn(async () => ({ flags: { id: 'a1' } }))
    ;(cmd as any).getAgentStore = vi.fn(() => store)
    ;(cmd as any).getTmuxManager = vi.fn(() => tmux)
    ;(cmd as any).getAudit = vi.fn(() => audit)
    ;(cmd as any).log = vi.fn()
    await cmd.run()
    expect(tmux.killSessionName).toHaveBeenCalledWith('sess')
    expect(store.delete).toHaveBeenCalledWith('a1')
  })

  it('agent spawn-team creates 5 agents', async () => {
    const factory = { createAgent: vi.fn(async (cfg: any) => ({ id: cfg.name, name: cfg.name, role: cfg.role, sessionName: cfg.name })) }
    const cmd = new AgentSpawnTeam([], {} as any)
    ;(cmd as any).parse = vi.fn(async () => ({ flags: { prefix: 't', layout: 'collaborative' } }))
    ;(cmd as any).getAgentFactory = vi.fn(() => factory)
    ;(cmd as any).log = vi.fn()
    await cmd.run()
    expect(factory.createAgent).toHaveBeenCalledTimes(5)
  })

  it('screen list prints sessions', async () => {
    const tmux = { listSessions: vi.fn(async () => [{ name: 'sess', active: true, createdAt: new Date() }]) }
    const cmd = new ScreenList([], {} as any)
    ;(cmd as any).getTmuxManager = vi.fn(() => tmux)
    const out: string[] = []
    ;(cmd as any).log = (s: string) => out.push(s)
    await cmd.run()
    expect(out.join('\n')).toContain('sess')
  })

  it('screen attach uses session name', async () => {
    const tmux = { attachSessionName: vi.fn(async () => undefined) }
    const cmd = new ScreenAttach([], {} as any)
    ;(cmd as any).parse = vi.fn(async () => ({ flags: { session: 'sess', agent: undefined } }))
    ;(cmd as any).getTmuxManager = vi.fn(() => tmux)
    await cmd.run()
    expect(tmux.attachSessionName).toHaveBeenCalledWith('sess')
  })

  it('screen attach uses agent id', async () => {
    const tmux = { attachSessionName: vi.fn(async () => undefined) }
    const store = { get: vi.fn(() => ({ sessionName: 'sess' })) }
    const cmd = new ScreenAttach([], {} as any)
    ;(cmd as any).parse = vi.fn(async () => ({ flags: { session: undefined, agent: 'a1' } }))
    ;(cmd as any).getTmuxManager = vi.fn(() => tmux)
    ;(cmd as any).getAgentStore = vi.fn(() => store)
    await cmd.run()
    expect(tmux.attachSessionName).toHaveBeenCalledWith('sess')
  })

  it('screen attach errors when args missing', async () => {
    const cmd = new ScreenAttach([], {} as any)
    ;(cmd as any).parse = vi.fn(async () => ({ flags: { session: undefined, agent: undefined } }))
    ;(cmd as any).error = (m: string) => {
      throw new Error(m)
    }
    await expect(cmd.run()).rejects.toThrow(/Provide --session or --agent/)
  })

  it('screen layout updates layout', async () => {
    const tmux = { setLayout: vi.fn(async () => undefined) }
    const cmd = new ScreenLayout([], {} as any)
    ;(cmd as any).parse = vi.fn(async () => ({ flags: { session: 'sess', layout: 'dev' } }))
    ;(cmd as any).getTmuxManager = vi.fn(() => tmux)
    ;(cmd as any).log = vi.fn()
    await cmd.run()
    expect(tmux.setLayout).toHaveBeenCalledWith('sess', 'dev')
  })

  it('run assigns task and sends to tmux', async () => {
    const store = {
      list: vi.fn(() => [
        { id: 'a1', sessionName: 'sess1', role: AgentRole.FRONTEND_DEVELOPER },
        { id: 'a2', sessionName: 'sess2', role: AgentRole.BACKEND_DEVELOPER }
      ])
    }
    const tmux = { sendCommandToSession: vi.fn(async () => undefined) }
    const orchestrator = {
      assignTask: vi.fn(async () => [{ agentId: 'a1', task: { id: 't1', description: 'x' } }]),
      broadcast: vi.fn(async () => ({ id: 'm', from: 'x', to: '*', type: 'broadcast', content: 'c', timestamp: new Date() }))
    }
    const cmd = new Run([], {} as any)
    ;(cmd as any).parse = vi.fn(async () => ({ args: { task: 'Build UI' }, flags: { ensureTeam: false } }))
    ;(cmd as any).getAgentStore = vi.fn(() => store)
    ;(cmd as any).getTmuxManager = vi.fn(() => tmux)
    ;(cmd as any).log = vi.fn()
    vi.spyOn(cmd as any, 'getOrchestrator').mockReturnValue(orchestrator)
    await cmd.run()
    expect(orchestrator.assignTask).toHaveBeenCalled()
    expect(tmux.sendCommandToSession).toHaveBeenCalled()
  })

  it('run ensures team when enabled', async () => {
    const store = { list: vi.fn(() => []) }
    const factory = { createAgent: vi.fn(async () => ({ id: 'x', sessionName: 's' })) }
    const tmux = { sendCommandToSession: vi.fn(async () => undefined) }
    const orchestrator = { assignTask: vi.fn(async () => []), broadcast: vi.fn(async () => ({ id: 'm' })) }
    const cmd = new Run([], {} as any)
    ;(cmd as any).parse = vi.fn(async () => ({ args: { task: 'x' }, flags: { ensureTeam: true } }))
    ;(cmd as any).getAgentStore = vi.fn(() => store)
    ;(cmd as any).getAgentFactory = vi.fn(() => factory)
    ;(cmd as any).getTmuxManager = vi.fn(() => tmux)
    ;(cmd as any).getOrchestrator = vi.fn(() => orchestrator)
    ;(cmd as any).log = vi.fn()
    await cmd.run()
    expect(factory.createAgent).toHaveBeenCalledTimes(5)
  })
})
