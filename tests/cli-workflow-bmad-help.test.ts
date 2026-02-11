import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { WorkflowStore } from '../src/state/workflow-store.js'
import { resetStateDb } from '../src/state/state-db.js'
import BmadHelp from '../src/cli/commands/workflow/bmad-help.js'

describe('workflow bmad-help', () => {
  const prevHome = process.env.PLATYPUS_HOME
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-bmad-help-'))
    process.env.PLATYPUS_HOME = tmpDir
    resetStateDb()
  })

  afterEach(() => {
    resetStateDb()
    if (prevHome === undefined) delete process.env.PLATYPUS_HOME
    else process.env.PLATYPUS_HOME = prevHome
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('suggests dev-story after quick-spec', async () => {
    const store = new WorkflowStore()
    const run = store.createRun('quick-spec', '/tmp')
    store.setRunStatus(run.id, 'done')
    const cmd = new BmadHelp([], {} as any)
    ;(cmd as any).log = vi.fn()
    await cmd.run()
    const text = (cmd as any).log.mock.calls.map((c: any[]) => c.join(' ')).join('\n')
    expect(text).toContain('dev-story')
  })

  it('suggests quick-spec when no runs exist', async () => {
    const cmd = new BmadHelp([], {} as any)
    ;(cmd as any).log = vi.fn()
    await cmd.run()
    const text = (cmd as any).log.mock.calls.map((c: any[]) => c.join(' ')).join('\n')
    expect(text).toContain('quick-spec')
  })

  it('warns when latest run is not done', async () => {
    const store = new WorkflowStore()
    const run = store.createRun('dev-story', '/tmp')
    store.setRunStatus(run.id, 'running')
    const cmd = new BmadHelp([], {} as any)
    ;(cmd as any).log = vi.fn()
    await cmd.run()
    const text = (cmd as any).log.mock.calls.map((c: any[]) => c.join(' ')).join('\n')
    expect(text).toContain('status=running')
  })
})
