import { describe, expect, it } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { Workspace } from '../src/core/workspace.js'

const { createToolRegistry } = await import('../src/engine/tooling.js')

describe('tooling allowlist', () => {
  it('denies disabled tools and keeps declined writes staged', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-tools-allow-'))
    const ws = new Workspace(tmpDir)
    let confirmCalls = 0
    const approval = {
      autoApprove: false,
      confirmRun: async () => true,
      confirmWrite: async () => confirmCalls++ > 0
    }
    const tools = createToolRegistry({ workspace: ws, approval: approval as any, agentId: 't', allowedToolNames: ['write_file', 'apply_writes'] })

    const listed = tools.list().map(t => t.name).join(',')
    expect(listed).toContain('write_file')
    expect(listed).not.toContain('read_file')

    await tools.execute({ id: '1', name: 'write_file', arguments: { path: 'a.txt', content: 'a\n' } })
    const denied = await tools.execute({ id: '2', name: 'read_file', arguments: { path: 'a.txt' } })
    expect(denied).toContain('Denied')

    const applied = await tools.execute({ id: '3', name: 'apply_writes', arguments: {} })
    expect(applied).toMatch(/Applied|No writes applied/)
    expect(fs.existsSync(path.join(tmpDir, 'a.txt'))).toBe(false)

    const applied2 = await tools.execute({ id: '4', name: 'apply_writes', arguments: {} })
    expect(applied2).toContain('Applied')
    expect(fs.readFileSync(path.join(tmpDir, 'a.txt'), 'utf8')).toBe('a\n')

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})
