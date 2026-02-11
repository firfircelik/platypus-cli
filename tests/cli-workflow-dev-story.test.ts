import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

vi.mock('../src/engine/chat-session.js', () => ({
  createChatSession: vi.fn(async () => ({
    handleUserMessageStream: vi.fn(async (_t: string, onText: (d: string) => void) => {
      onText('done')
      return 'done'
    }),
    handleUserMessage: vi.fn(async () => 'done'),
    runTool: vi.fn(async (name: string) => (name === 'show_writes' ? 'Staged writes:\n[1] a.txt\n\ndiff --git a/a.txt b/a.txt' : '')),
    configure: vi.fn(async () => undefined),
    getConfig: vi.fn(() => ({ provider: 'openai', root: '/tmp', mode: 'build' }))
  }))
}))

import DevStory from '../src/cli/commands/workflow/dev-story.js'
import { resetStateDb } from '../src/state/state-db.js'

describe('workflow dev-story', () => {
  const prevHome = process.env.PLATYPUS_HOME
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-wf-ds-'))
    process.env.PLATYPUS_HOME = tmpDir
    resetStateDb()
  })

  afterEach(() => {
    resetStateDb()
    if (prevHome === undefined) delete process.env.PLATYPUS_HOME
    else process.env.PLATYPUS_HOME = prevHome
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('prints staged changes hint', async () => {
    const cmd = new DevStory(['story text'], {} as any)
    ;(cmd as any).parse = vi.fn(async () => ({
      args: { story: 'story text' },
      flags: { runId: undefined, provider: 'openai', model: undefined, root: tmpDir, autoApprove: false, profile: undefined }
    }))
    ;(cmd as any).log = vi.fn()
    await cmd.run()
    const text = (cmd as any).log.mock.calls.map((c: any[]) => c.join(' ')).join('\n')
    expect(text).toContain('Staged changes')
    expect(text).toContain('Run id:')
  })
})
