import { describe, expect, it } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { getStateDb, resetStateDb } from '../src/state/state-db.js'
import { FileLockManager } from '../src/state/file-lock-manager.js'

describe('FileLockManager', () => {
  it('acquires and releases lock', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-lock-'))
    const prevHome = process.env.HOME
    process.env.HOME = tmpDir
    resetStateDb()
    getStateDb()

    const locks = new FileLockManager()
    const lock = await locks.acquireLock('agent1', '/tmp/a.txt', 1000)
    const active = await locks.checkLock('/tmp/a.txt')
    expect(active?.agentId).toBe('agent1')

    await locks.releaseLock(lock.id)
    const after = await locks.checkLock('/tmp/a.txt')
    expect(after).toBeNull()

    resetStateDb()
    process.env.HOME = prevHome
  })

  it('prevents acquiring when active lock exists', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-lock-2-'))
    const prevHome = process.env.HOME
    process.env.HOME = tmpDir
    resetStateDb()
    getStateDb()

    const locks = new FileLockManager()
    await locks.acquireLock('agent1', '/tmp/a.txt', 60_000)
    await expect(locks.acquireLock('agent2', '/tmp/a.txt', 60_000)).rejects.toThrow(/locked by agent agent1/)

    resetStateDb()
    process.env.HOME = prevHome
  })

  it('clears expired lock on check', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-lock-3-'))
    const prevHome = process.env.HOME
    process.env.HOME = tmpDir
    resetStateDb()
    const db = getStateDb()

    db.prepare(
      'INSERT OR REPLACE INTO file_locks (file_path, lock_id, agent_id, acquired_at, expires_at) VALUES (?, ?, ?, ?, ?)'
    ).run('/tmp/a.txt', 'l1', 'agent1', new Date().toISOString(), new Date(Date.now() - 1000).toISOString())

    const locks = new FileLockManager()
    const active = await locks.checkLock('/tmp/a.txt')
    expect(active).toBeNull()

    resetStateDb()
    process.env.HOME = prevHome
  })
})
