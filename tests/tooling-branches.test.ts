import { describe, expect, it, vi } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { Workspace } from '../src/core/workspace.js'

vi.mock('node:child_process', () => ({
  spawnSync: (cmd: any, args: any) => {
    if (cmd === 'git' && Array.isArray(args) && args[0] === 'diff') {
      return { status: 0, stdout: 'diff --git a/x b/x\n', stderr: '' }
    }
    return { status: 1, stdout: '', stderr: 'fail' }
  }
}))

const { createToolRegistry } = await import('../src/engine/tooling.js')

describe('tooling branches', () => {
  it('keeps declined writes staged and applies accepted writes', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-tools-branches-'))
    const ws = new Workspace(tmpDir)
    let call = 0
    const approval = {
      autoApprove: false,
      confirmRun: vi.fn(async () => true),
      confirmWrite: vi.fn(async () => call++ > 0)
    }
    const tools = createToolRegistry({ workspace: ws, approval: approval as any, agentId: 't' })

    await tools.execute({ id: '1', name: 'write_file', arguments: { path: 'a.txt', content: 'a\n' } })
    await tools.execute({ id: '2', name: 'write_file', arguments: { path: 'b.txt', content: 'b\n' } })

    const apply = await tools.execute({ id: '3', name: 'apply_writes', arguments: {} })
    expect(apply).toMatch(/Applied|No writes applied/)
    expect(fs.existsSync(path.join(tmpDir, 'b.txt'))).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, 'a.txt'))).toBe(false)

    const remaining = await tools.execute({ id: '4', name: 'show_writes', arguments: {} })
    expect(remaining).toContain('diff --git')

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('rejects missing args', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-tools-branches-2-'))
    const ws = new Workspace(tmpDir)
    const approval = { autoApprove: false, confirmRun: vi.fn(async () => true), confirmWrite: vi.fn(async () => true) }
    const tools = createToolRegistry({ workspace: ws, approval: approval as any, agentId: 't' })
    expect(await tools.execute({ id: '1', name: 'search_files', arguments: { query: '' } })).toContain('Error')
    expect(await tools.execute({ id: '2', name: 'patch_file', arguments: { patch: '' } })).toContain('Error')
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('handles command approval and failures', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-tools-branches-3-'))
    const ws = new Workspace(tmpDir)
    const approval = { autoApprove: false, confirmRun: vi.fn(async () => false), confirmWrite: vi.fn(async () => false) }
    const tools = createToolRegistry({ workspace: ws, approval: approval as any, agentId: 't' })

    const skipped = await tools.execute({ id: '1', name: 'run_command', arguments: { command: 'git status' } })
    expect(skipped).toContain('declined')

    ;(approval.confirmRun as any).mockResolvedValueOnce(true)
    const failed = await tools.execute({ id: '2', name: 'run_command', arguments: { command: 'git status' } })
    expect(failed).toContain('Exit')

    const patchSkipped = await tools.execute({ id: '3', name: 'patch_file', arguments: { patch: 'diff --git a/a b/a\n' } })
    expect(patchSkipped).toContain('declined')

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})
