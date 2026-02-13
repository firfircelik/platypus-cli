import { describe, expect, it } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { AgentStore } from '../src/state/agent-store.js'
import { resetStateDb } from '../src/state/state-db.js'
import { AgentRole, AgentState } from '../src/types/agent.types.js'

describe('AgentStore', () => {
  it('upserts and lists agents', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-state-'))
    const prevHome = process.env.HOME
    process.env.HOME = tmpDir
    resetStateDb()

    const store = new AgentStore()
    store.upsert({
      id: 'a1',
      name: 'agent',
      role: AgentRole.BACKEND_DEVELOPER,
      capabilities: ['api'],
      sessionId: 'sid',
      sessionName: 'sess',
      paneId: 'pid',
      state: AgentState.IDLE,
      context: {} as any,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      lastActivity: new Date('2026-01-01T00:00:00.000Z')
    })

    const listed = store.list()
    expect(listed.length).toBe(1)
    expect(listed[0].sessionName).toBe('sess')
    expect(store.get('a1')?.id).toBe('a1')
    expect(store.get('missing')).toBeNull()

    store.delete('a1')
    expect(store.list().length).toBe(0)

    resetStateDb()
    process.env.HOME = prevHome
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('get returns null for non-existent agent', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-state-'))
    const prevHome = process.env.HOME
    process.env.HOME = tmpDir
    resetStateDb()

    const store = new AgentStore()
    const agent = store.get('non-existent-agent-id')
    expect(agent).toBeNull()

    resetStateDb()
    process.env.HOME = prevHome
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})
