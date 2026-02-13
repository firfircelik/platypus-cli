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

  it('getResult returns null for non-existent task', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-tasks-'))
    const prevHome = process.env.HOME
    process.env.HOME = tmpDir
    resetStateDb()

    const store = new AgentTaskStore()
    const res = store.getResult('non-existent-id')
    expect(res).toBeNull()

    resetStateDb()
    process.env.HOME = prevHome
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('get returns null for non-existent task', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-tasks-'))
    const prevHome = process.env.HOME
    process.env.HOME = tmpDir
    resetStateDb()

    const store = new AgentTaskStore()
    const task = store.get('non-existent-id')
    expect(task).toBeNull()

    resetStateDb()
    process.env.HOME = prevHome
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('get retrieves task by id', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-tasks-'))
    const prevHome = process.env.HOME
    process.env.HOME = tmpDir
    resetStateDb()

    const store = new AgentTaskStore()
    const t = store.enqueue('a2', 'test task')
    const retrieved = store.get(t.id)
    expect(retrieved).not.toBeNull()
    expect(retrieved?.id).toBe(t.id)
    expect(retrieved?.agentId).toBe('a2')
    expect(retrieved?.description).toBe('test task')
    expect(retrieved?.status).toBe('pending')
    expect(retrieved?.createdAt).toBeInstanceOf(Date)
    expect(retrieved?.updatedAt).toBeInstanceOf(Date)

    resetStateDb()
    process.env.HOME = prevHome
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('setResult updates existing result on conflict', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-tasks-'))
    const prevHome = process.env.HOME
    process.env.HOME = tmpDir
    resetStateDb()

    const store = new AgentTaskStore()
    const t = store.enqueue('a3', 'initial task')
    store.setResult(t.id, 'a3', 'done', 'first output')
    store.setResult(t.id, 'a3', 'failed', 'second output')
    const res = store.getResult(t.id)
    expect(res?.status).toBe('failed')
    expect(res?.output).toBe('second output')

    resetStateDb()
    process.env.HOME = prevHome
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})
