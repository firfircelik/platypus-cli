import { describe, expect, it } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { Workspace } from '../src/core/workspace.js'

const { createToolRegistry } = await import('../src/engine/tooling.js')

describe('tooling selection', () => {
  it('shows, applies, and discards selected staged writes', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-tools-sel-'))
    const ws = new Workspace(tmpDir)
    const approval = { autoApprove: false, confirmRun: async () => true, confirmWrite: async () => true }
    const tools = createToolRegistry({ workspace: ws, approval: approval as any, agentId: 't' })

    await tools.execute({ id: '1', name: 'write_file', arguments: { path: 'a.txt', content: 'a\n' } })
    await tools.execute({ id: '2', name: 'write_file', arguments: { path: 'b.txt', content: 'b\n' } })

    const summary = await tools.execute({ id: '3', name: 'show_writes', arguments: { summaryOnly: true } })
    expect(summary).toContain('[1] a.txt')
    expect(summary).toContain('[2] b.txt')

    const applied = await tools.execute({ id: '4', name: 'apply_writes', arguments: { ids: [2] } })
    expect(applied).toContain('Applied')
    expect(fs.existsSync(path.join(tmpDir, 'b.txt'))).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, 'a.txt'))).toBe(false)

    const discarded = await tools.execute({ id: '5', name: 'discard_writes', arguments: { ids: [1] } })
    expect(discarded).toContain('Discarded')

    const remaining = await tools.execute({ id: '6', name: 'show_writes', arguments: {} })
    expect(remaining).toBe('')

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('discards selected while keeping others', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-tools-sel-2-'))
    const ws = new Workspace(tmpDir)
    const approval = { autoApprove: false, confirmRun: async () => true, confirmWrite: async () => true }
    const tools = createToolRegistry({ workspace: ws, approval: approval as any, agentId: 't' })

    await tools.execute({ id: '1', name: 'write_file', arguments: { path: 'a.txt', content: 'a\n' } })
    await tools.execute({ id: '2', name: 'write_file', arguments: { path: 'b.txt', content: 'b\n' } })

    const discarded = await tools.execute({ id: '3', name: 'discard_writes', arguments: { ids: [1] } })
    expect(discarded).toContain('Discarded')
    const remaining = await tools.execute({ id: '4', name: 'show_writes', arguments: {} })
    expect(remaining).toContain('b.txt')
    await tools.execute({ id: '5', name: 'apply_writes', arguments: {} })
    expect(fs.existsSync(path.join(tmpDir, 'b.txt'))).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, 'a.txt'))).toBe(false)

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})
