import { v4 as uuidv4 } from 'uuid'
import { getStateDb } from './state-db.js'
import type { Lock } from '../types/agent.types.js'

export class FileLockManager {
  async acquireLock(agentId: string, filePath: string, ttlMs: number = 5 * 60 * 1000): Promise<Lock> {
    const db = getStateDb()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + ttlMs)
    const existing = db.prepare('SELECT * FROM file_locks WHERE file_path = ?').get(filePath) as any

    if (existing) {
      const existingExpires = existing.expires_at ? new Date(existing.expires_at) : null
      if (!existingExpires || existingExpires.getTime() > Date.now()) {
        throw new Error(`File is locked by agent ${existing.agent_id}`)
      }
    }

    const lock: Lock = {
      id: uuidv4(),
      agentId,
      filePath,
      acquiredAt: now,
      expiresAt
    }

    db.prepare(
      'INSERT OR REPLACE INTO file_locks (file_path, lock_id, agent_id, acquired_at, expires_at) VALUES (?, ?, ?, ?, ?)'
    ).run(filePath, lock.id, agentId, now.toISOString(), expiresAt.toISOString())

    return lock
  }

  async releaseLock(lockId: string): Promise<void> {
    const db = getStateDb()
    db.prepare('DELETE FROM file_locks WHERE lock_id = ?').run(lockId)
  }

  async checkLock(filePath: string): Promise<Lock | null> {
    const db = getStateDb()
    const row = db.prepare('SELECT * FROM file_locks WHERE file_path = ?').get(filePath) as any
    if (!row) return null

    const expiresAt = row.expires_at ? new Date(row.expires_at) : null
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      db.prepare('DELETE FROM file_locks WHERE file_path = ?').run(filePath)
      return null
    }

    return {
      id: row.lock_id,
      agentId: row.agent_id,
      filePath: row.file_path,
      acquiredAt: new Date(row.acquired_at),
      expiresAt
    }
  }
}
