import fs from 'node:fs'
import { v4 as uuidv4 } from 'uuid'
import { getAuditLogPath } from './paths.js'
import type { AuditEntry } from '../types/agent.types.js'

export class AuditLogger {
  private auditPath: string

  constructor(auditPath: string = getAuditLogPath()) {
    this.auditPath = auditPath
  }

  write(entry: Omit<AuditEntry, 'id' | 'timestamp'> & { timestamp?: Date }): AuditEntry {
    const full: AuditEntry = {
      id: uuidv4(),
      agentId: entry.agentId,
      action: entry.action,
      resource: entry.resource,
      details: entry.details,
      timestamp: entry.timestamp ?? new Date()
    }

    fs.appendFileSync(this.auditPath, `${JSON.stringify(full)}\n`, { encoding: 'utf8' })
    return full
  }
}
