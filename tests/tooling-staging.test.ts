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
  spawnSync: vi.fn((cmd: any, args: any) => {
    if (cmd === 'git' && Array.isArray(args) && args[0] === 'diff') {
      return { status: 0, stdout: '', stderr: '' }
    }
    if (cmd === 'git' && Array.isArray(args) && args[0] === 'apply') {
      return { status: 0, stdout: '', stderr: '' }
    }
    if (cmd === 'rg') {
      if (Array.isArray(args) && args[6] === 'boom') {
        return { status: 2, stdout: '', stderr: 'rg err' }
      }
      return { status: 0, stdout: 'a.txt:1:hello\n', stderr: '' }
    }
    return { status: 0, stdout: '', stderr: '' }
  })
}))

const { createDefaultApprovalPrompt, createToolRegistry } = await import('../src/engine/tooling.js')
const childProcess = await import('node:child_process')

describe('tooling staging', () => {
  it('stages writes and applies them', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-tools-3-'))
    const ws = new Workspace(tmpDir)
    const approval = createDefaultApprovalPrompt({ autoApprove: false })
    const tools = createToolRegistry({ workspace: ws, approval, agentId: 't' })

    const staged = await tools.execute({ id: '1', name: 'write_file', arguments: { path: 'b.txt', content: 'hi\n' } })
    expect(staged).toMatch(/diff --/)
    expect(fs.existsSync(path.join(tmpDir, 'b.txt'))).toBe(false)

    const diffs = await tools.execute({ id: '2', name: 'show_writes', arguments: {} })
    expect(diffs).toMatch(/diff --/)

    const applied = await tools.execute({ id: '3', name: 'apply_writes', arguments: {} })
    expect(applied).toMatch(/Applied|No writes applied/)
    expect(fs.readFileSync(path.join(tmpDir, 'b.txt'), 'utf8')).toBe('hi\n')
    const empty = await tools.execute({ id: '4', name: 'show_writes', arguments: {} })
    expect(empty).toBe('')

    const js = await tools.execute({ id: '5', name: 'write_json', arguments: { path: 'c.json', value: { a: 1 } } })
    expect(js).toMatch(/diff --/)

    const patch = await tools.execute({ id: '6', name: 'patch_file', arguments: { patch: 'diff --git a/a b/a\n' } })
    expect(patch).toBe('OK')

    const search = await tools.execute({ id: '7', name: 'search_files', arguments: { query: 'hello', dir: '.' } })
    expect(search).toContain('a.txt')

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns OK for allowlisted command with empty output', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-tools-3-ok-'))
    const ws = new Workspace(tmpDir)
    const approval = createDefaultApprovalPrompt({ autoApprove: true })
    const tools = createToolRegistry({ workspace: ws, approval, agentId: 't' })

    const out = await tools.execute({ id: '8', name: 'run_command', arguments: { command: 'git status' } })
    expect(out).toBe('OK')

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns rg stderr when ripgrep fails', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-tools-3-rg-'))
    const ws = new Workspace(tmpDir)
    const approval = createDefaultApprovalPrompt({ autoApprove: true })
    const tools = createToolRegistry({ workspace: ws, approval, agentId: 't' })

    const out = await tools.execute({ id: '9', name: 'search_files', arguments: { query: 'boom', dir: '.' } })
    expect(out).toBe('rg err')

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns exit when git apply fails', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-tools-3-apply-'))
    const ws = new Workspace(tmpDir)
    const approval = createDefaultApprovalPrompt({ autoApprove: false })
    const tools = createToolRegistry({ workspace: ws, approval, agentId: 't' })

    vi.mocked(childProcess.spawnSync).mockImplementationOnce(((cmd: any, args: any) => {
      if (cmd === 'git' && Array.isArray(args) && args[0] === 'apply') {
        return { status: 1, stdout: '', stderr: 'apply err' }
      }
      return { status: 0, stdout: '', stderr: '' }
    }) as any)

    const out = await tools.execute({ id: '10', name: 'patch_file', arguments: { patch: 'diff --git a/a b/a\n' } })
    expect(out).toContain('Exit 1')

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns error when listing a missing directory', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-tools-3-list-'))
    const ws = new Workspace(tmpDir)
    const approval = createDefaultApprovalPrompt({ autoApprove: true })
    const tools = createToolRegistry({ workspace: ws, approval, agentId: 't' })

    const out = await tools.execute({ id: '11', name: 'list_files', arguments: { dir: 'missing' } })
    expect(out).toMatch(/Error:/)

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('keeps staged writes when discard ids do not match', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-tools-3-discard-'))
    const ws = new Workspace(tmpDir)
    const approval = createDefaultApprovalPrompt({ autoApprove: false })
    const tools = createToolRegistry({ workspace: ws, approval, agentId: 't' })

    await tools.execute({ id: '12', name: 'write_file', arguments: { path: 'a.txt', content: 'a\n' } })
    await tools.execute({ id: '13', name: 'write_file', arguments: { path: 'b.txt', content: 'b\n' } })

    const discarded = await tools.execute({ id: '14', name: 'discard_writes', arguments: { ids: [99] } })
    expect(discarded).toBe('No writes discarded')

    const remaining = await tools.execute({ id: '15', name: 'show_writes', arguments: {} })
    expect(remaining).toContain('a.txt')
    expect(remaining).toContain('b.txt')

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})
