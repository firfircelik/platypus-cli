import { v4 as uuidv4 } from 'uuid'
import { getStateDb } from './state-db.js'
import type { ConflictResolution, FileConflict } from '../types/agent.types.js'

export class ConflictManager {
  recordConflict(filePath: string, agents: string[], changes?: Record<string, string>): FileConflict {
    const db = getStateDb()
    const conflict: FileConflict = {
      id: uuidv4(),
      filePath,
      agents,
      changes: new Map(Object.entries(changes ?? {})),
      detectedAt: new Date()
    }
    db.prepare('INSERT INTO conflicts (id, file_path, agents, detected_at, resolution) VALUES (?, ?, ?, ?, ?)').run(
      conflict.id,
      conflict.filePath,
      JSON.stringify(conflict.agents),
      conflict.detectedAt.toISOString(),
      null
    )
    return conflict
  }

  listConflicts(): Array<{ id: string; filePath: string; agents: string[]; detectedAt: Date; resolved: boolean }> {
    const db = getStateDb()
    const rows = db.prepare('SELECT * FROM conflicts ORDER BY detected_at DESC').all() as any[]
    return rows.map(r => ({
      id: r.id,
      filePath: r.file_path,
      agents: JSON.parse(r.agents),
      detectedAt: new Date(r.detected_at),
      resolved: !!r.resolution
    }))
  }

  resolve(conflictId: string, resolution: ConflictResolution): void {
    const db = getStateDb()
    db.prepare('UPDATE conflicts SET resolution = ? WHERE id = ?').run(JSON.stringify(resolution), conflictId)
  }
}

