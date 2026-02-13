import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { GoogleClient } from '../src/llm/google-client.js'
import { KeyStore } from '../src/crypto/key-store.js'

describe('GoogleClient Edge Cases', () => {
  const prevKey = process.env.GOOGLE_API_KEY
  let ksMock: any
  let getKeyMock: any

  beforeEach(() => {
    delete process.env.GOOGLE_API_KEY
    ksMock = vi.spyOn(KeyStore.prototype, 'initialize').mockResolvedValue(undefined)
    getKeyMock = vi.spyOn(KeyStore.prototype, 'getKey').mockResolvedValue('gk-keystore-key')
  })

  afterEach(() => {
    process.env.GOOGLE_API_KEY = prevKey
    ksMock?.mockRestore()
    getKeyMock?.mockRestore()
  })

  it('creates client using KeyStore when env var is not set', async () => {
    const client = await GoogleClient.create('gemini-1.5-flash')
    expect(client).toBeInstanceOf(GoogleClient)
  })

  it('handles multiple function calls in one response', async () => {
    process.env.GOOGLE_API_KEY = 'gk-test'
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  { functionCall: { name: 'read_file', args: { path: 'a.txt' } } },
                  { functionCall: { name: 'read_file', args: { path: 'b.txt' } } }
                ]
              }
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Done reading files.' }]
              }
            }
          ]
        })
      })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async () => 'content')
    }

    const client = await GoogleClient.create('gemini-1.5-flash')
    const res = await client.generateWithTools({ messages: [{ role: 'user', content: 'read both files' }], tools: tools as any, maxSteps: 2 })
    expect(tools.execute as any).toHaveBeenCalledTimes(2)

    ;(globalThis as any).fetch = prevFetch
    delete process.env.GOOGLE_API_KEY
  })

  it('handles content with both text and function call', async () => {
    process.env.GOOGLE_API_KEY = 'gk-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                { text: 'I will read the file for you.' },
                { functionCall: { name: 'read_file', args: { path: 'a.txt' } } }
              ]
            }
          }
        ]
      })
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async () => 'content')
    }

    const client = await GoogleClient.create('gemini-1.5-flash')
    const res = await client.generateWithTools({ messages: [{ role: 'user', content: 'read file' }], tools: tools as any, maxSteps: 2 })
    const assistantMsg = res.newMessages.find(m => m.role === 'assistant')
    expect(assistantMsg?.content).toBe('I will read the file for you.')
    expect(assistantMsg?.toolCalls?.length).toBe(1)

    ;(globalThis as any).fetch = prevFetch
    delete process.env.GOOGLE_API_KEY
  })

  it('handles malformed tool call arguments gracefully', async () => {
    process.env.GOOGLE_API_KEY = 'gk-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ functionCall: { name: 'read_file', args: { path: 'a.txt', extra: null } } }]
            }
          }
        ]
      })
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async (call: any) => {
        expect(call.arguments.path).toBe('a.txt')
        return 'content'
      })
    }

    const client = await GoogleClient.create('gemini-1.5-flash')
    await client.generateWithTools({ messages: [{ role: 'user', content: 'read' }], tools: tools as any, maxSteps: 2 })

    ;(globalThis as any).fetch = prevFetch
    delete process.env.GOOGLE_API_KEY
  })

  it('handles empty candidates array', async () => {
    process.env.GOOGLE_API_KEY = 'gk-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [] })
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [],
      execute: vi.fn(async () => '')
    }

    const client = await GoogleClient.create('gemini-1.5-flash')
    const res = await client.generateWithTools({ messages: [{ role: 'user', content: 'hi' }], tools: tools as any, maxSteps: 1 })
    expect(res.outputText).toBe('')

    ;(globalThis as any).fetch = prevFetch
    delete process.env.GOOGLE_API_KEY
  })

  it('handles response with no content parts', async () => {
    process.env.GOOGLE_API_KEY = 'gk-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: {} }]
      })
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [],
      execute: vi.fn(async () => '')
    }

    const client = await GoogleClient.create('gemini-1.5-flash')
    const res = await client.generateWithTools({ messages: [{ role: 'user', content: 'hi' }], tools: tools as any, maxSteps: 1 })
    expect(res.outputText).toBe('')

    ;(globalThis as any).fetch = prevFetch
    delete process.env.GOOGLE_API_KEY
  })

  it('converts tool role messages to function responses', async () => {
    process.env.GOOGLE_API_KEY = 'gk-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'done' }] } }]
      })
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async () => '')
    }

    const client = await GoogleClient.create('gemini-1.5-flash')
    await client.generateWithTools({
      messages: [{ role: 'tool', content: 'result', toolCallId: 'tc1', name: 'read_file' }],
      tools: tools as any,
      maxSteps: 1
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.contents).toContainEqual(
      expect.objectContaining({
        role: 'user',
        parts: [expect.objectContaining({ functionResponse: expect.any(Object) })]
      })
    )

    ;(globalThis as any).fetch = prevFetch
    delete process.env.GOOGLE_API_KEY
  })

  it('handles tool messages without name', async () => {
    process.env.GOOGLE_API_KEY = 'gk-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'done' }] } }]
      })
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [],
      execute: vi.fn(async () => '')
    }

    const client = await GoogleClient.create('gemini-1.5-flash')
    await client.generateWithTools({
      messages: [{ role: 'tool', content: 'result' }],
      tools: tools as any,
      maxSteps: 1
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.contents).toContainEqual(
      expect.objectContaining({
        role: 'user',
        parts: [expect.objectContaining({ functionResponse: expect.objectContaining({ name: 'tool' }) })]
      })
    )

    ;(globalThis as any).fetch = prevFetch
    delete process.env.GOOGLE_API_KEY
  })

  it('converts assistant messages with both content and tool calls', async () => {
    process.env.GOOGLE_API_KEY = 'gk-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'done' }] } }]
      })
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async () => '')
    }

    const client = await GoogleClient.create('gemini-1.5-flash')
    await client.generateWithTools({
      messages: [{ role: 'assistant', content: 'thinking', toolCalls: [{ id: 'tc1', name: 'read_file', arguments: '{"path":"a.txt"}' }] }],
      tools: tools as any,
      maxSteps: 1
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    const modelContent = body.contents.find((c: any) => c.role === 'model')
    expect(modelContent.parts).toHaveLength(2)
    expect(modelContent.parts[0]).toHaveProperty('text', 'thinking')
    expect(modelContent.parts[1]).toHaveProperty('functionCall')

    ;(globalThis as any).fetch = prevFetch
    delete process.env.GOOGLE_API_KEY
  })

  it('handles assistant message with empty content', async () => {
    process.env.GOOGLE_API_KEY = 'gk-test'
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'done' }] } }]
      })
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async () => '')
    }

    const client = await GoogleClient.create('gemini-1.5-flash')
    await client.generateWithTools({
      messages: [{ role: 'assistant', content: '', toolCalls: [{ id: 'tc1', name: 'read_file', arguments: '{"path":"a.txt"}' }] }],
      tools: tools as any,
      maxSteps: 1
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    const modelContent = body.contents.find((c: any) => c.role === 'model')
    expect(modelContent.parts).toHaveLength(1)
    expect(modelContent.parts[0]).toHaveProperty('functionCall')

    ;(globalThis as any).fetch = prevFetch
    delete process.env.GOOGLE_API_KEY
  })

  it('stops after max steps and returns partial text', async () => {
    process.env.GOOGLE_API_KEY = 'gk-test'
    const fetchMock = vi.fn().mockResolvedValue({
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

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async () => 'content')
    }

    const client = await GoogleClient.create('gemini-1.5-flash')
    const res = await client.generateWithTools({ messages: [{ role: 'user', content: 'read' }], tools: tools as any, maxSteps: 2 })
    expect(res.outputText).toBe('Stopped (max steps reached).')

    ;(globalThis as any).fetch = prevFetch
    delete process.env.GOOGLE_API_KEY
  })

  it('handles safeJsonParse with non-object JSON values', async () => {
    process.env.GOOGLE_API_KEY = 'gk-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'done' }] } }]
      })
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async (call: any) => {
        expect(call.arguments).toEqual({})
        return 'content'
      })
    }

    const client = await GoogleClient.create('gemini-1.5-flash')
    await client.generateWithTools({
      messages: [{ role: 'assistant', content: 'thinking', toolCalls: [{ id: 'tc1', name: 'read_file', arguments: '"just a string"' }] }],
      tools: tools as any,
      maxSteps: 1
    })

    ;(globalThis as any).fetch = prevFetch
    delete process.env.GOOGLE_API_KEY
  })

  it('handles safeJsonParse with array JSON value', async () => {
    process.env.GOOGLE_API_KEY = 'gk-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'done' }] } }]
      })
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async (call: any) => {
        expect(call.arguments).toEqual({})
        return 'content'
      })
    }

    const client = await GoogleClient.create('gemini-1.5-flash')
    await client.generateWithTools({
      messages: [{ role: 'assistant', content: 'thinking', toolCalls: [{ id: 'tc1', name: 'read_file', arguments: '[1,2,3]' }] }],
      tools: tools as any,
      maxSteps: 1
    })

    ;(globalThis as any).fetch = prevFetch
    delete process.env.GOOGLE_API_KEY
  })

  it('handles API error response when text extraction fails', async () => {
    process.env.GOOGLE_API_KEY = 'gk-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Error details'
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [],
      execute: vi.fn(async () => '')
    }

    const client = await GoogleClient.create('gemini-1.5-flash')
    await expect(async () => {
      await client.generateWithTools({ messages: [{ role: 'user', content: 'hi' }], tools: tools as any, maxSteps: 1 })
    }).rejects.toThrow('Google request failed: 500 Internal Server Error: Error details')

    ;(globalThis as any).fetch = prevFetch
    delete process.env.GOOGLE_API_KEY
  })
})
