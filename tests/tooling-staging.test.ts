import { describe, expect, it, vi } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { Workspace } from '../src/core/workspace.js'

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(async () => ({ ok: true }))
  }
}))

vi.mock('node:child_process', () => ({
  spawnSync: (cmd: any, args: any) => {
    if (cmd === 'git' && Array.isArray(args) && args[0] === 'diff') {
      return { status: 0, stdout: 'diff --git a/x b/x\n', stderr: '' }
    }
    if (cmd === 'git' && Array.isArray(args) && args[0] === 'apply') {
      return { status: 0, stdout: '', stderr: '' }
    }
    if (cmd === 'rg') {
      return { status: 0, stdout: 'a.txt:1:hello\n', stderr: '' }
    }
    return { status: 0, stdout: '', stderr: '' }
  }
}))

const { createDefaultApprovalPrompt, createToolRegistry } = await import('../src/engine/tooling.js')

describe('tooling staging', () => {
  it('stages writes and applies them', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-tools-3-'))
    const ws = new Workspace(tmpDir)
    const approval = createDefaultApprovalPrompt({ autoApprove: false })
    const tools = createToolRegistry({ workspace: ws, approval, agentId: 't' })

    const staged = await tools.execute({ id: '1', name: 'write_file', arguments: { path: 'b.txt', content: 'hi\n' } })
    expect(staged).toContain('diff --git')
    expect(fs.existsSync(path.join(tmpDir, 'b.txt'))).toBe(false)

    const diffs = await tools.execute({ id: '2', name: 'show_writes', arguments: {} })
    expect(diffs).toContain('diff --git')

    const applied = await tools.execute({ id: '3', name: 'apply_writes', arguments: {} })
    expect(applied).toMatch(/Applied|No writes applied/)
    expect(fs.readFileSync(path.join(tmpDir, 'b.txt'), 'utf8')).toBe('hi\n')
    const empty = await tools.execute({ id: '4', name: 'show_writes', arguments: {} })
    expect(empty).toBe('')

    const js = await tools.execute({ id: '5', name: 'write_json', arguments: { path: 'c.json', value: { a: 1 } } })
    expect(js).toContain('diff --git')

    const patch = await tools.execute({ id: '6', name: 'patch_file', arguments: { patch: 'diff --git a/a b/a\n' } })
    expect(patch).toBe('OK')

    const search = await tools.execute({ id: '7', name: 'search_files', arguments: { query: 'hello', dir: '.' } })
    expect(search).toContain('a.txt')

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})
