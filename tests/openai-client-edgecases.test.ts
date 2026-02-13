import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { OpenAiClient } from '../src/llm/openai-client.js'
import { KeyStore } from '../src/crypto/key-store.js'

describe('OpenAiClient Edge Cases', () => {
  const prevKey = process.env.OPENAI_API_KEY
  let ksMock: any
  let getKeyMock: any

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY
    ksMock = vi.spyOn(KeyStore.prototype, 'initialize').mockResolvedValue(undefined)
    getKeyMock = vi.spyOn(KeyStore.prototype, 'getKey').mockResolvedValue('sk-keystore-key')
  })

  afterEach(() => {
    process.env.OPENAI_API_KEY = prevKey
    ksMock?.mockRestore()
    getKeyMock?.mockRestore()
  })

  it('creates client using KeyStore when env var is not set', async () => {
    const client = await OpenAiClient.create('gpt-4o-mini')
    expect(client).toBeInstanceOf(OpenAiClient)
  })

  it('handles multiple tool calls in one response', async () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: null, tool_calls: [{ id: 'tc1', type: 'function', function: { name: 'read_file', arguments: '{"path":"a.txt"}' } }, { id: 'tc2', type: 'function', function: { name: 'read_file', arguments: '{"path":"b.txt"}' } }] } }]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'Done reading files.', tool_calls: null } }]
        })
      })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async () => 'content')
    }

    const client = await OpenAiClient.create('gpt-4o-mini')
    const res = await client.generateWithTools({ messages: [{ role: 'user', content: 'read both files' }], tools: tools as any, maxSteps: 2 })
    expect(tools.execute as any).toHaveBeenCalledTimes(2)

    ;(globalThis as any).fetch = prevFetch
    delete process.env.OPENAI_API_KEY
  })

  it('handles content with both text and tool calls', async () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { role: 'assistant', content: 'I will read the file for you.', tool_calls: [{ id: 'tc1', type: 'function', function: { name: 'read_file', arguments: '{"path":"a.txt"}' } }] } }]
      })
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async () => 'content')
    }

    const client = await OpenAiClient.create('gpt-4o-mini')
    const res = await client.generateWithTools({ messages: [{ role: 'user', content: 'read file' }], tools: tools as any, maxSteps: 2 })
    const assistantMsg = res.newMessages.find(m => m.role === 'assistant')
    expect(assistantMsg?.content).toBe('I will read the file for you.')
    expect(assistantMsg?.toolCalls?.length).toBe(1)

    ;(globalThis as any).fetch = prevFetch
    delete process.env.OPENAI_API_KEY
  })

  it('handles empty tool_calls array', async () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { role: 'assistant', content: 'done', tool_calls: [] } }]
      })
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [],
      execute: vi.fn(async () => '')
    }

    const client = await OpenAiClient.create('gpt-4o-mini')
    const res = await client.generateWithTools({ messages: [{ role: 'user', content: 'hi' }], tools: tools as any, maxSteps: 1 })
    expect(res.outputText).toBe('done')

    ;(globalThis as any).fetch = prevFetch
    delete process.env.OPENAI_API_KEY
  })

  it('stops after max steps and returns partial text', async () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { role: 'assistant', content: null, tool_calls: [{ id: 'tc1', type: 'function', function: { name: 'read_file', arguments: '{"path":"a.txt"}' } }] } }]
      })
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async () => 'content')
    }

    const client = await OpenAiClient.create('gpt-4o-mini')
    const res = await client.generateWithTools({ messages: [{ role: 'user', content: 'read' }], tools: tools as any, maxSteps: 2 })
    expect(res.outputText).toBe('Stopped (max steps reached).')

    ;(globalThis as any).fetch = prevFetch
    delete process.env.OPENAI_API_KEY
  })

  it('handles non-JSON SSE events gracefully', async () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    const invalidSse = [
      'data: invalid json\n\n',
      'data: {"choices":[{"delta":{"content":"valid"}}]}\n\n',
      'data: [DONE]\n\n'
    ].join('')
    const bytes = new TextEncoder().encode(invalidSse)
    let used = false

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => ({
          read: async () => {
            if (used) return { done: true, value: undefined }
            used = true
            return { done: false, value: bytes }
          }
        })
      }
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const client = await OpenAiClient.create('gpt-4o-mini')
    const deltas: string[] = []
    const res = await client.streamWithTools!({
      messages: [{ role: 'user', content: 'hi' }],
      tools: { list: () => [], execute: async () => '' } as any,
      onText: d => deltas.push(d),
      maxSteps: 1
    })
    expect(res.outputText).toBe('valid')

    ;(globalThis as any).fetch = prevFetch
    delete process.env.OPENAI_API_KEY
  })

  it('accumulates streaming tool call arguments', async () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    
    // Simulate real OpenAI SSE streaming format for tool call arguments
    // The arguments field contains incremental JSON chunks
    const chunk1 = '{"path"'
    const chunk2 = ':"a.txt"'
    const chunk3 = '}'
    
    const sseChunks = [
      { index: 0, id: 'tc1', name: 'read_file', args: chunk1 },
      { index: 0, args: chunk2 },
      { index: 0, args: chunk3 }
    ].map(chunk => {
      const toolCallData: any = { index: chunk.index, function: { arguments: chunk.args } }
      if (chunk.id) toolCallData.id = chunk.id
      if (chunk.name) toolCallData.function.name = chunk.name
      
      const dataLine = JSON.stringify({
        choices: [{ delta: { tool_calls: [toolCallData] } }]
      })
      return `data: ${dataLine}\n\n`
    }).join('') + 'data: [DONE]\n\n'
    
    const bytes = new TextEncoder().encode(sseChunks)
    let used = false

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: async () => {
            if (used) return { done: true, value: undefined }
            used = true
            return { done: false, value: bytes }
          }
        })
      }
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [
        { name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }
      ],
      execute: vi.fn(async () => 'content')
    }

    const client = await OpenAiClient.create('gpt-4o-mini')
    const res = await client.streamWithTools!({
      messages: [{ role: 'user', content: 'read' }],
      tools: tools as any,
      onText: () => undefined,
      maxSteps: 1
    })
    const assistantMsg = res.newMessages.find(m => m.role === 'assistant')
    expect(assistantMsg?.toolCalls?.[0].arguments).toBe('{"path":"a.txt"}')

    ;(globalThis as any).fetch = prevFetch
    delete process.env.OPENAI_API_KEY
  })

  it('returns assistant text when tool calls exist but text is also present', async () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'Here is the file content:',
              tool_calls: [{ id: 'tc1', function: { name: 'read_file', arguments: '{"path":"a.txt"}' } }]
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

    const client = await OpenAiClient.create('gpt-4o-mini')
    const res = await client.generateWithTools({ messages: [{ role: 'user', content: 'read' }], tools: tools as any, maxSteps: 2 })
    const assistantMsg = res.newMessages.find(m => m.role === 'assistant')
    expect(assistantMsg?.content).toBe('Here is the file content:')
    expect(assistantMsg?.toolCalls?.length).toBe(1)

    ;(globalThis as any).fetch = prevFetch
    delete process.env.OPENAI_API_KEY
  })

  it('handles missing stream body (line 207-208)', async () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: undefined
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async () => 'content')
    }

    const client = await OpenAiClient.create('gpt-4o-mini')
    await expect(client.streamWithTools!({
      messages: [{ role: 'user', content: 'hi' }],
      tools: tools as any,
      onText: () => undefined,
      maxSteps: 1
    })).rejects.toThrow('OpenAI stream missing body')

    ;(globalThis as any).fetch = prevFetch
    delete process.env.OPENAI_API_KEY
  })

  it('handles invalid JSON in SSE event (line 270)', async () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    const invalidSse = [
      'data: {"invalid json}\n\n',
      'data: {"choices":[{"delta":{"content":"valid"}}]}\n\n',
      'data: [DONE]\n\n'
    ].join('')
    const bytes = new TextEncoder().encode(invalidSse)
    let used = false

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: async () => {
            if (used) return { done: true, value: undefined }
            used = true
            return { done: false, value: bytes }
          }
        })
      }
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const client = await OpenAiClient.create('gpt-4o-mini')
    const deltas: string[] = []
    const res = await client.streamWithTools!({
      messages: [{ role: 'user', content: 'hi' }],
      tools: { list: () => [], execute: async () => '' } as any,
      onText: d => deltas.push(d),
      maxSteps: 1
    })
    expect(res.outputText).toBe('valid')

    ;(globalThis as any).fetch = prevFetch
    delete process.env.OPENAI_API_KEY
  })

  it('handles JSON array in SSE (line 262 - returns null for non-object)', async () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    const arraySse = [
      'data: [1, 2, 3]\n\n',
      'data: {"choices":[{"delta":{"content":"text"}}]}\n\n',
      'data: [DONE]\n\n'
    ].join('')
    const bytes = new TextEncoder().encode(arraySse)
    let used = false

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: async () => {
            if (used) return { done: true, value: undefined }
            used = true
            return { done: false, value: bytes }
          }
        })
      }
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const client = await OpenAiClient.create('gpt-4o-mini')
    const res = await client.streamWithTools!({
      messages: [{ role: 'user', content: 'hi' }],
      tools: { list: () => [], execute: async () => '' } as any,
      onText: () => undefined,
      maxSteps: 1
    })
    expect(res.outputText).toBe('text')

    ;(globalThis as any).fetch = prevFetch
    delete process.env.OPENAI_API_KEY
  })
})
