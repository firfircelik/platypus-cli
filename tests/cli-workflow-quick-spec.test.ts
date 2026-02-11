import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

vi.mock('../src/engine/chat-session.js', () => ({
  createChatSession: vi.fn(async () => ({
    handleUserMessageStream: vi.fn(async (_t: string, onText: (d: string) => void) => {
      onText('spec')
      return 'spec'
    }),
    handleUserMessage: vi.fn(async () => 'spec'),
    runTool: vi.fn(async () => ''),
    configure: vi.fn(async () => undefined),
    getConfig: vi.fn(() => ({ provider: 'openai', root: '/tmp', mode: 'plan' }))
  }))
}))

import QuickSpec from '../src/cli/commands/workflow/quick-spec.js'
import { resetStateDb } from '../src/state/state-db.js'

describe('workflow quick-spec', () => {
  const prevHome = process.env.PLATYPUS_HOME
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-wf-qs-'))
    process.env.PLATYPUS_HOME = tmpDir
    resetStateDb()
  })

  afterEach(() => {
    resetStateDb()
    if (prevHome === undefined) delete process.env.PLATYPUS_HOME
    else process.env.PLATYPUS_HOME = prevHome
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('runs and records run id', async () => {
    const cmd = new QuickSpec([], {} as any)
    ;(cmd as any).parse = vi.fn(async () => ({ flags: { provider: 'openai', model: undefined, root: tmpDir, profile: undefined } }))
    ;(cmd as any).log = vi.fn()
    await cmd.run()
    expect((cmd as any).log.mock.calls.map((c: any[]) => c.join(' ')).join('\n')).toContain('Run id:')
  })
})
