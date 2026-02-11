import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

vi.mock('../src/engine/chat-session.js', () => ({
  createChatSession: vi.fn(async () => ({
    handleUserMessageStream: vi.fn(async (_t: string, onText: (d: string) => void) => {
      onText('review')
      return 'review'
    }),
    handleUserMessage: vi.fn(async () => 'review'),
    runTool: vi.fn(async (name: string) => (name === 'show_writes' ? '' : 'diff --git a/a b/a')),
    configure: vi.fn(async () => undefined),
    getConfig: vi.fn(() => ({ provider: 'openai', root: '/tmp', mode: 'plan' }))
  }))
}))

import CodeReview from '../src/cli/commands/workflow/code-review.js'
import { resetStateDb } from '../src/state/state-db.js'

describe('workflow code-review', () => {
  const prevHome = process.env.PLATYPUS_HOME
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-wf-cr-'))
    process.env.PLATYPUS_HOME = tmpDir
    resetStateDb()
  })

  afterEach(() => {
    resetStateDb()
    if (prevHome === undefined) delete process.env.PLATYPUS_HOME
    else process.env.PLATYPUS_HOME = prevHome
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('runs with focus and prints run id', async () => {
    const cmd = new CodeReview([], {} as any)
    ;(cmd as any).parse = vi.fn(async () => ({
      args: { focus: 'tests' },
      flags: { runId: undefined, provider: 'openai', model: undefined, root: tmpDir, profile: undefined }
    }))
    ;(cmd as any).log = vi.fn()
    await cmd.run()
    expect((cmd as any).log.mock.calls.map((c: any[]) => c.join(' ')).join('\n')).toContain('Run id:')
  })
})
