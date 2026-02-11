import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { InMemoryMessageBus } from '../src/state/message-bus.js'
import { SkillRegistry } from '../src/skills/registry.js'
import { Workspace } from '../src/core/workspace.js'

describe('Misc modules', () => {
  it('in-memory message bus publishes and subscribes', async () => {
    const bus = new InMemoryMessageBus()
    const received: string[] = []
    const unsub = await bus.subscribe(m => received.push(m.content))
    await bus.publish({ from: 'a', to: '*', type: 'broadcast', content: 'hello' })
    expect(received).toEqual(['hello'])
    await unsub()
    await bus.close()
  })

  it('skill registry loads from directory', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-skill-'))
    fs.writeFileSync(
      path.join(tmpDir, 's1.json'),
      JSON.stringify({ id: 's1', name: 'Skill', version: '1.0.0', description: 'd', entry: './index.js' }),
      'utf8'
    )
    const reg = new SkillRegistry()
    reg.loadFromDir(tmpDir)
    expect(reg.get('s1')?.name).toBe('Skill')
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('workspace blocks path traversal', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-ws-'))
    const ws = new Workspace(
      tmpDir,
      { acquireLock: vi.fn(async () => ({ id: 'l', agentId: 'a', filePath: '', acquiredAt: new Date(), expiresAt: null })), releaseLock: vi.fn(async () => undefined) } as any,
      { write: vi.fn() } as any,
      { recordConflict: vi.fn() } as any
    )
    await expect(ws.readFile('../x')).rejects.toThrow(/Path traversal/)
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('workspace writes file with lock', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-ws-write-'))
    fs.writeFileSync(path.join(tmpDir, 'a.txt'), 'old', 'utf8')
    const locks = { acquireLock: vi.fn(async () => ({ id: 'l', agentId: 'a', filePath: '', acquiredAt: new Date(), expiresAt: null })), releaseLock: vi.fn(async () => undefined) }
    const audit = { write: vi.fn() }
    const ws = new Workspace(tmpDir, locks as any, audit as any, { recordConflict: vi.fn() } as any)
    await ws.writeFile('a', 'a.txt', 'new')
    expect(fs.readFileSync(path.join(tmpDir, 'a.txt'), 'utf8')).toBe('new')
    expect(locks.acquireLock).toHaveBeenCalled()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('workspace records conflict when lock fails', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-ws-conflict-'))
    const locks = { acquireLock: vi.fn(async () => { throw new Error('File is locked by agent other') }), releaseLock: vi.fn(async () => undefined) }
    const audit = { write: vi.fn() }
    const conflicts = { recordConflict: vi.fn() }
    const ws = new Workspace(tmpDir, locks as any, audit as any, conflicts as any)
    await expect(ws.writeFile('me', 'a.txt', 'x')).rejects.toThrow()
    expect(conflicts.recordConflict).toHaveBeenCalled()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})
