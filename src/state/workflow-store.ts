import { getStateDb } from './state-db.js'
import { v4 as uuidv4 } from 'uuid'

export type WorkflowStatus = 'pending' | 'running' | 'done' | 'failed'

export type WorkflowRun = {
  id: string
  name: string
  root: string
  status: WorkflowStatus
  createdAt: Date
  updatedAt: Date
}

export type WorkflowStep = {
  id: string
  runId: string
  name: string
  status: WorkflowStatus
  input: string | null
  output: string | null
  createdAt: Date
  updatedAt: Date
}

export class WorkflowStore {
  createRun(name: string, root: string): WorkflowRun {
    const db = getStateDb()
    const id = uuidv4()
    const now = new Date().toISOString()
    db.prepare('INSERT INTO workflow_runs (id, name, root, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      id,
      name,
      root,
      'pending',
      now,
      now
    )
    return { id, name, root, status: 'pending', createdAt: new Date(now), updatedAt: new Date(now) }
  }

  setRunStatus(runId: string, status: WorkflowStatus): void {
    const db = getStateDb()
    const now = new Date().toISOString()
    db.prepare('UPDATE workflow_runs SET status = ?, updated_at = ? WHERE id = ?').run(status, now, runId)
  }

  addStep(runId: string, name: string, input?: string): WorkflowStep {
    const db = getStateDb()
    const id = uuidv4()
    const now = new Date().toISOString()
    db.prepare(
      'INSERT INTO workflow_steps (id, run_id, name, status, input, output, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, runId, name, 'pending', input ?? null, null, now, now)
    return { id, runId, name, status: 'pending', input: input ?? null, output: null, createdAt: new Date(now), updatedAt: new Date(now) }
  }

  setStepStatus(stepId: string, status: WorkflowStatus, output?: string): void {
    const db = getStateDb()
    const now = new Date().toISOString()
    db.prepare('UPDATE workflow_steps SET status = ?, output = COALESCE(?, output), updated_at = ? WHERE id = ?').run(
      status,
      output ?? null,
      now,
      stepId
    )
  }

  latestRun(): WorkflowRun | null {
    const db = getStateDb()
    const row = db.prepare('SELECT * FROM workflow_runs ORDER BY created_at DESC LIMIT 1').get() as any
    if (!row) return null
    return {
      id: row.id,
      name: row.name,
      root: row.root,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }

  getRun(runId: string): WorkflowRun | null {
    const db = getStateDb()
    const row = db.prepare('SELECT * FROM workflow_runs WHERE id = ?').get(runId) as any
    if (!row) return null
    return {
      id: row.id,
      name: row.name,
      root: row.root,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }

  listSteps(runId: string): WorkflowStep[] {
    const db = getStateDb()
    const rows = db.prepare('SELECT * FROM workflow_steps WHERE run_id = ? ORDER BY created_at ASC').all(runId) as any[]
    return rows.map(r => ({
      id: r.id,
      runId: r.run_id,
      name: r.name,
      status: r.status,
      input: r.input ?? null,
      output: r.output ?? null,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at)
    }))
  }
}
