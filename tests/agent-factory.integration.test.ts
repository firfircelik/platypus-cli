import { describe, expect, it, vi } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { resetStateDb } from '../src/state/state-db.js'
import { AgentFactory } from '../src/agents/agent-factory.js'
import { AgentRole, AgentState } from '../src/types/agent.types.js'

vi.mock('../src/screen/tmux-manager.js', () => ({
  TmuxManager: class {
    async createSession(config: any) {
      return { session: { id: 'sid-' + config.name, name: config.name, pid: 1, socketPath: '', createdAt: new Date(), active: true }, panes: [] }
    }
    getDefaultPaneId() {
      return 'pid'
    }
    async killSession() {
      return
    }
    async sendCommand() {
      return
    }
    async cleanup() {
      return
    }
  }
}))

describe('AgentFactory integration', () => {
  it('transitions agent states and persists', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-factory-'))
    const prevHome = process.env.HOME
    process.env.HOME = tmpDir
    resetStateDb()

    const factory = new AgentFactory({ maxAgents: 5 })
    const agent = await factory.createAgent({ name: 'agent', role: AgentRole.BACKEND_DEVELOPER, capabilities: [] })
    expect(agent.state).toBe(AgentState.IDLE)

    await factory.startAgent(agent.id)
    expect(factory.getAgent(agent.id)?.state).toBe(AgentState.RUNNING)

    await factory.executeTask(agent.id, { id: 't1', description: 'do', priority: 'low', type: 'nl', requirements: {}, dependencies: [] })
    await factory.stopAgent(agent.id)
    expect(factory.getAgent(agent.id)?.state).toBe(AgentState.STOPPED)

    await factory.destroyAgent(agent.id)
    expect(factory.getAgent(agent.id)).toBeUndefined()

    resetStateDb()
    process.env.HOME = prevHome
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('enforces limits and validates transitions', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-factory-2-'))
    const prevHome = process.env.HOME
    process.env.HOME = tmpDir
    resetStateDb()

    const factory = new AgentFactory({ maxAgents: 1 })
    const a1 = await factory.createAgent({ name: 'a1', role: AgentRole.FRONTEND_DEVELOPER, capabilities: [] })
    await expect(factory.startAgent('missing')).rejects.toThrow(/Agent not found/)
    await expect(factory.stopAgent('missing')).rejects.toThrow(/Agent not found/)
    await expect(factory.destroyAgent('missing')).rejects.toThrow(/Agent not found/)
    await expect(factory.createAgent({ name: 'a2', role: AgentRole.BACKEND_DEVELOPER, capabilities: [] })).rejects.toThrow(
      /Maximum agent limit/
    )

    await expect(
      factory.executeTask(a1.id, { id: 't', description: 'x', priority: 'low', type: 'nl', requirements: {}, dependencies: [] })
    ).rejects.toThrow(/not running/i)
    await expect(
      factory.executeTask('missing', { id: 't', description: 'x', priority: 'low', type: 'nl', requirements: {}, dependencies: [] })
    ).rejects.toThrow(/Agent not found/i)

    await expect(factory.pauseAgent(a1.id)).rejects.toThrow(/not running/i)
    await factory.startAgent(a1.id)
    await expect(factory.resumeAgent(a1.id)).rejects.toThrow(/not paused/i)
    await factory.pauseAgent(a1.id)
    await factory.resumeAgent(a1.id)
    await factory.stopAgent(a1.id)

    ;(factory as any).tmuxManager.killSession = vi.fn(async () => {
      throw new Error('tmux fail')
    })
    await expect(factory.destroyAgent(a1.id)).rejects.toThrow(/Failed to destroy agent/)

    const byRole = factory.listAgentsByRole(AgentRole.FRONTEND_DEVELOPER)
    expect(byRole.length).toBe(1)
    expect(factory.getStats().totalAgents).toBe(1)

    ;(factory as any).destroyAgent = vi.fn(async () => {
      throw new Error('fail')
    })
    await factory.cleanup()

    resetStateDb()
    process.env.HOME = prevHome
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})
