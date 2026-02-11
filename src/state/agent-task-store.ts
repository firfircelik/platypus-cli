import { v4 as uuidv4 } from 'uuid'
import { getStateDb } from './state-db.js'

export type AgentTaskStatus = 'pending' | 'running' | 'done' | 'failed'

export type AgentTask = {
  id: string
  agentId: string
  description: string
  status: AgentTaskStatus
  createdAt: Date
  updatedAt: Date
}

export type AgentTaskResult = {
  taskId: string
  agentId: string
  status: AgentTaskStatus
  output: string
  updatedAt: Date
}

export class AgentTaskStore {
  enqueue(agentId: string, description: string): AgentTask {
    const db = getStateDb()
    const now = new Date().toISOString()
    const task: AgentTask = {
      id: uuidv4(),
      agentId,
      description,
      status: 'pending',
      createdAt: new Date(now),
      updatedAt: new Date(now)
    }
    db.prepare(
      'INSERT INTO agent_tasks (id, agent_id, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(task.id, task.agentId, task.description, task.status, now, now)
    return task
  }

  nextPending(agentId: string): AgentTask | null {
    const db = getStateDb()
    const row = db
      .prepare('SELECT * FROM agent_tasks WHERE agent_id = ? AND status = ? ORDER BY created_at ASC LIMIT 1')
      .get(agentId, 'pending') as any
    if (!row) return null
    return {
      id: row.id,
      agentId: row.agent_id,
      description: row.description,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }

  setStatus(taskId: string, status: AgentTaskStatus): void {
    const db = getStateDb()
    const now = new Date().toISOString()
    db.prepare('UPDATE agent_tasks SET status = ?, updated_at = ? WHERE id = ?').run(status, now, taskId)
  }

  setResult(taskId: string, agentId: string, status: AgentTaskStatus, output: string): void {
    const db = getStateDb()
    const now = new Date().toISOString()
    db.prepare(
      'INSERT INTO agent_task_results (task_id, agent_id, status, output, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(task_id) DO UPDATE SET status=excluded.status, output=excluded.output, updated_at=excluded.updated_at'
    ).run(taskId, agentId, status, output, now)
  }

  getResult(taskId: string): AgentTaskResult | null {
    const db = getStateDb()
    const row = db.prepare('SELECT * FROM agent_task_results WHERE task_id = ?').get(taskId) as any
    if (!row) return null
    return {
      taskId: row.task_id,
      agentId: row.agent_id,
      status: row.status,
      output: row.output,
      updatedAt: new Date(row.updated_at)
    }
  }

  get(taskId: string): AgentTask | null {
    const db = getStateDb()
    const row = db.prepare('SELECT * FROM agent_tasks WHERE id = ?').get(taskId) as any
    if (!row) return null
    return {
      id: row.id,
      agentId: row.agent_id,
      description: row.description,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }
}
