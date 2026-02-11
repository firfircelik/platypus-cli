import { describe, expect, it, vi } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

vi.mock('../src/llm/index.js', () => ({
  createLlmClient: vi.fn(async ({ provider }: any) => {
    if (provider === 'nostream') {
      return {
        generateWithTools: vi.fn(async ({ messages }: any) => ({
          outputText: 'hi',
          newMessages: [{ role: 'assistant', content: `echo:${messages[messages.length - 1].content}` }]
        }))
      }
    }
    return {
      generateWithTools: vi.fn(async ({ messages }: any) => ({
        outputText: 'hi',
        newMessages: [{ role: 'assistant', content: `echo:${messages[messages.length - 1].content}` }]
      })),
      streamWithTools: vi.fn(async ({ messages, onText }: any) => {
        onText('h')
        onText('i')
        return { outputText: 'hi', newMessages: [{ role: 'assistant', content: `echo:${messages[messages.length - 1].content}` }] }
      })
    }
  })
}))

import { createChatSession } from '../src/engine/chat-session.js'

describe('chat session', () => {
  it('adds messages and returns output', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-chat-'))
    fs.writeFileSync(path.join(tmpDir, 'a.txt'), 'x', 'utf8')
    const session = await createChatSession({ provider: 'openai', model: undefined, root: tmpDir, autoApprove: true })
    const out = await session.handleUserMessage('hello')
    expect(out).toContain('hi')
    const deltas: string[] = []
    const out2 = await session.handleUserMessageStream('hello2', d => deltas.push(d))
    expect(out2).toContain('hi')
    expect(deltas.join('')).toBe('hi')
    const file = await session.runTool('read_file', { path: 'a.txt' })
    expect(file).toBe('x')
    await session.configure({ model: 'm2' })
    expect(session.getConfig().model).toBe('m2')
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('streams via generate when client has no streamWithTools', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-chat-2-'))
    const session = await createChatSession({ provider: 'nostream', model: undefined, root: tmpDir, autoApprove: true })
    const deltas: string[] = []
    const out = await session.handleUserMessageStream('x', d => deltas.push(d))
    expect(out).toContain('hi')
    expect(deltas.join('')).toContain('hi')
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})
