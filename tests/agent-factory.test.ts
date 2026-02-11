import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/screen/tmux-manager.js', () => ({
  TmuxManager: class {
    async createSession() {
      return { session: { id: 'sid', name: 'sess', pid: 1, socketPath: '', createdAt: new Date(), active: true }, panes: [] }
    }
    getDefaultPaneId() {
      return 'pid'
    }
    async killSession() {
      return
    }
    async cleanup() {
      return
    }
  }
}))

vi.mock('../src/state/agent-store.js', () => ({
  AgentStore: class {
    upsert = vi.fn()
    delete = vi.fn()
  }
}))

vi.mock('../src/core/audit.js', () => ({
  AuditLogger: class {
    write = vi.fn()
  }
}))

import { AgentFactory } from '../src/agents/agent-factory.js'
import { AgentRole } from '../src/types/agent.types.js'

describe('AgentFactory', () => {
  it('creates agent and persists', async () => {
    const factory = new AgentFactory({ maxAgents: 5 })
    const agent = await factory.createAgent({ name: 'a', role: AgentRole.BACKEND_DEVELOPER, capabilities: [] })
    expect(agent.sessionName).toBeTruthy()
    expect(agent.paneId).toBe('pid')
  })
})

