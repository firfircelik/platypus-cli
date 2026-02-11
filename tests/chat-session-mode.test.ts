import { describe, expect, it, vi } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

vi.mock('../src/llm/index.js', () => ({
  createLlmClient: vi.fn(async () => ({
    generateWithTools: vi.fn(async () => ({ outputText: 'ok', newMessages: [] }))
  }))
}))

import { createChatSession } from '../src/engine/chat-session.js'

describe('chat session mode', () => {
  it('denies write tools in plan mode', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-chat-mode-'))
    fs.writeFileSync(path.join(tmpDir, 'a.txt'), 'x', 'utf8')

    const session = await createChatSession({ provider: 'openai', model: undefined, root: tmpDir, autoApprove: true, mode: 'plan' })
    const denied = await session.runTool('write_file', { path: 'b.txt', content: 'y' })
    expect(denied).toContain('Denied')
    const listed = await session.runTool('list_files', { dir: '.' })
    expect(listed).toContain('a.txt')

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})
