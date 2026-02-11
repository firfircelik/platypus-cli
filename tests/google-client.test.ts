import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { GoogleClient } from '../src/llm/google-client.js'

describe('GoogleClient', () => {
  const prevKey = process.env.GOOGLE_API_KEY

  beforeEach(() => {
    process.env.GOOGLE_API_KEY = 'gk-test'
  })

  afterEach(() => {
    process.env.GOOGLE_API_KEY = prevKey
  })

  it('executes tool calls and returns final text', async () => {
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ functionCall: { name: 'read_file', args: { path: 'a.txt' } } }]
              }
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'done' }] } }]
        })
      })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async () => 'hello')
    }

    const client = await GoogleClient.create('gemini-1.5-flash')
    const res = await client.generateWithTools({ messages: [{ role: 'user', content: 'read' }], tools: tools as any, maxSteps: 4 })
    expect(res.outputText).toBe('done')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect((tools.execute as any).mock.calls.length).toBe(1)

    ;(globalThis as any).fetch = prevFetch
  })
})

