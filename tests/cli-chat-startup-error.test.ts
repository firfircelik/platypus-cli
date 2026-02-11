import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/engine/chat-session.js', () => ({
  createChatSession: vi.fn(async () => {
    throw new Error('missing key')
  })
}))

import Chat from '../src/cli/commands/chat.js'

describe('cli chat startup error', () => {
  it('prints setup hints when session creation fails', async () => {
    const cmd = new Chat([], {} as any)
    ;(cmd as any).parse = vi.fn(async () => ({
      flags: { provider: 'openai', model: undefined, autoApprove: false, root: undefined, profile: undefined }
    }))
    ;(cmd as any).log = vi.fn()
    await cmd.run()
    const out = (cmd as any).log.mock.calls.map((c: any[]) => c.join(' ')).join('\n')
    expect(out).toContain('Failed to start chat')
    expect(out).toContain('platypus keys add openai')
  })
})
