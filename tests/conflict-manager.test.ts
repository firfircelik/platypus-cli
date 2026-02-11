import { describe, expect, it } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { ConflictManager } from '../src/state/conflict-manager.js'
import { resetStateDb } from '../src/state/state-db.js'

describe('ConflictManager', () => {
  it('records, lists, and resolves conflicts', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-conflict-'))
    const prevHome = process.env.HOME
    process.env.HOME = tmpDir
    resetStateDb()

    const cm = new ConflictManager()
    const c = cm.recordConflict('/tmp/file.txt', ['a1', 'a2'])
    const listed = cm.listConflicts()
    expect(listed[0].id).toBe(c.id)
    cm.resolve(c.id, {
      type: 'manual',
      resolvedBy: 'a1',
      resolvedAt: new Date(),
      result: { path: '/tmp/file.txt', hash: '', modifiedBy: null, lockedBy: null, lockedAt: null, version: 1 }
    })
    const listed2 = cm.listConflicts()
    expect(listed2[0].resolved).toBe(true)

    resetStateDb()
    process.env.HOME = prevHome
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})
