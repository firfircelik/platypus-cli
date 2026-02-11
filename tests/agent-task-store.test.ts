import { describe, expect, it } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { resetStateDb } from '../src/state/state-db.js'
import { AgentTaskStore } from '../src/state/agent-task-store.js'

describe('AgentTaskStore', () => {
  it('enqueues and consumes pending tasks', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-tasks-'))
    const prevHome = process.env.HOME
    process.env.HOME = tmpDir
    resetStateDb()

    const store = new AgentTaskStore()
    const t = store.enqueue('a1', 'do it')
    expect(store.get(t.id)?.description).toBe('do it')
    const next = store.nextPending('a1')
    expect(next?.id).toBe(t.id)
    store.setStatus(t.id, 'done')
    store.setResult(t.id, 'a1', 'done', 'ok')
    const res = store.getResult(t.id)
    expect(res?.output).toBe('ok')
    const none = store.nextPending('a1')
    expect(none).toBeNull()

    resetStateDb()
    process.env.HOME = prevHome
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})
