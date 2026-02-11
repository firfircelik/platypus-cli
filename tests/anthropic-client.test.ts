import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { AnthropicClient } from '../src/llm/anthropic-client.js'

describe('AnthropicClient', () => {
  const prevKey = process.env.ANTHROPIC_API_KEY

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'ak-test'
  })

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = prevKey
  })

  it('executes tool calls and returns final text', async () => {
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'tool_use', id: 'tu1', name: 'read_file', input: { path: 'a.txt' } }]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'done' }]
        })
      })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async () => 'hello')
    }

    const client = await AnthropicClient.create('claude-3-5-sonnet-20241022')
    const res = await client.generateWithTools({ messages: [{ role: 'user', content: 'read' }], tools: tools as any, maxSteps: 4 })
    expect(res.outputText).toBe('done')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect((tools.execute as any).mock.calls.length).toBe(1)

    ;(globalThis as any).fetch = prevFetch
  })
})

