import { describe, expect, it, vi } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { Workspace } from '../src/core/workspace.js'

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn((cmd: string) => {
    if (cmd === 'rg') return { status: null, stdout: '', stderr: '' }
    if (cmd === 'git') return { status: 0, stdout: '', stderr: '' }
    return { status: 0, stdout: '', stderr: '' }
  })
}))

const { createDefaultApprovalPrompt, createToolRegistry } = await import('../src/engine/tooling.js')

describe('tooling search fallback', () => {
  it('searches without rg installed', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-search-fb-'))
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true })
    fs.writeFileSync(path.join(tmpDir, 'src', 'a.txt'), 'hello world\nbye\n', 'utf8')

    const ws = new Workspace(tmpDir)
    const approval = createDefaultApprovalPrompt({ autoApprove: true })
    const tools = createToolRegistry({ workspace: ws, approval, agentId: 't' })

    const out = await tools.execute({ id: '1', name: 'search_files', arguments: { query: 'hello', dir: '.' } })
    expect(out).toContain('src/a.txt:1:hello world')

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('handles missing directories and unreadable files', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-search-fb-2-'))
    fs.writeFileSync(path.join(tmpDir, 'a.txt'), 'hello\n', 'utf8')
    const unreadable = path.join(tmpDir, 'nope.txt')
    fs.writeFileSync(unreadable, 'hello\n', 'utf8')
    try {
      fs.chmodSync(unreadable, 0o000)
    } catch {
      return
    }

    const ws = new Workspace(tmpDir)
    const approval = createDefaultApprovalPrompt({ autoApprove: true })
    const tools = createToolRegistry({ workspace: ws, approval, agentId: 't' })

    const outMissing = await tools.execute({ id: '1', name: 'search_files', arguments: { query: 'hello', dir: 'missing' } })
    expect(outMissing).toBe('')

    const out = await tools.execute({ id: '2', name: 'search_files', arguments: { query: 'hello', dir: '.' } })
    expect(out).toContain('a.txt:1:hello')

    try {
      fs.chmodSync(unreadable, 0o600)
    } catch {
      return
    }
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})
