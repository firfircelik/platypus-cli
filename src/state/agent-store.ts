import { getStateDb } from './state-db.js'
import { AgentState } from '../types/agent.types.js'
import type { Agent } from '../types/agent.types.js'

export class AgentStore {
  upsert(agent: Agent): void {
    const db = getStateDb()
    db.prepare(
      `INSERT OR REPLACE INTO agents
      (id, name, role, capabilities, session_id, session_name, pane_id, state, created_at, updated_at, last_activity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      agent.id,
      agent.name,
      agent.role,
      JSON.stringify(agent.capabilities),
      agent.sessionId,
      agent.sessionName,
      agent.paneId,
      agent.state,
      agent.createdAt.toISOString(),
      agent.updatedAt.toISOString(),
      agent.lastActivity.toISOString()
    )
  }

  list(): Agent[] {
    const db = getStateDb()
    const rows = db.prepare('SELECT * FROM agents').all() as any[]
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      role: r.role,
      capabilities: JSON.parse(r.capabilities),
      sessionId: r.session_id,
      sessionName: r.session_name,
      paneId: r.pane_id,
      state: r.state as AgentState,
      context: {
        projectRoot: process.cwd(),
        files: new Map(),
        dependencies: { nodes: new Map(), edges: new Map() },
        configuration: { name: '', version: '', language: '', framework: '', buildCommand: '', testCommand: '', startCommand: '' },
        agentStates: new Map(),
        variables: new Map()
      },
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
      lastActivity: new Date(r.last_activity)
    }))
  }

  get(agentId: string): Agent | null {
    const db = getStateDb()
    const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId) as any
    if (!row) return null
    return this.list().find(a => a.id === agentId) ?? null
  }

  delete(agentId: string): void {
    const db = getStateDb()
    db.prepare('DELETE FROM agents WHERE id = ?').run(agentId)
  }
}
