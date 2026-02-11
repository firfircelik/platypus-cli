import { describe, expect, it } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { Workspace } from '../src/core/workspace.js'
import { createDefaultApprovalPrompt, createToolRegistry } from '../src/engine/tooling.js'

describe('tooling', () => {
  it('auto-approves prompt helpers', async () => {
    const approval = createDefaultApprovalPrompt({ autoApprove: true })
    expect(await approval.confirmRun('x')).toBe(true)
    expect(await approval.confirmWrite('a.txt', 'diff')).toBe(true)
  })

  it('reads files and deny non-allowlisted commands', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-tools-'))
    fs.writeFileSync(path.join(tmpDir, 'a.txt'), 'hello', 'utf8')

    const ws = new Workspace(tmpDir)
    const approval = createDefaultApprovalPrompt({ autoApprove: true })
    const tools = createToolRegistry({ workspace: ws, approval, agentId: 't' })

    const txt = await tools.execute({ id: '1', name: 'read_file', arguments: { path: 'a.txt' } })
    expect(txt).toBe('hello')

    const denied = await tools.execute({ id: '2', name: 'run_command', arguments: { command: 'rm -rf /' } })
    expect(denied).toMatch(/Denied/)

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('writes files and runs allowlisted commands', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-tools-2-'))
    const ws = new Workspace(tmpDir)
    const approval = createDefaultApprovalPrompt({ autoApprove: true })
    const tools = createToolRegistry({ workspace: ws, approval, agentId: 't' })

    const ok = await tools.execute({ id: '3', name: 'write_file', arguments: { path: 'b.txt', content: 'hi' } })
    expect(ok.length).toBeGreaterThan(0)
    expect(fs.readFileSync(path.join(tmpDir, 'b.txt'), 'utf8')).toBe('hi')

    const out = await tools.execute({ id: '4', name: 'run_command', arguments: { command: 'node --version' } })
    expect(out).toMatch(/v\d+/)

    const staged = await tools.execute({ id: '4b', name: 'show_writes', arguments: {} })
    expect(staged).toBe('')

    const list = await tools.execute({ id: '5', name: 'list_files', arguments: { dir: '.' } })
    expect(list).toContain('b.txt')

    const unknown = await tools.execute({ id: '6', name: 'nope', arguments: {} })
    expect(unknown).toMatch(/unknown tool/)

    const nothing = await tools.execute({ id: '7', name: 'apply_writes', arguments: {} })
    expect(nothing).toMatch(/Nothing/)

    const cmdErr = await tools.execute({ id: '8', name: 'run_command', arguments: { command: '' } })
    expect(cmdErr).toMatch(/required/)

    fs.writeFileSync(path.join(tmpDir, 'bad.json'), '{', 'utf8')
    const bad = await tools.execute({ id: '9', name: 'read_json', arguments: { path: 'bad.json' } })
    expect(bad).toMatch(/Error:/)

    const badWrite = await tools.execute({ id: '10', name: 'write_json', arguments: { path: 'x.json', value: BigInt(1) as any } })
    expect(badWrite).toMatch(/Error:/)

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})
