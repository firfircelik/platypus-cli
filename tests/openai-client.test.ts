import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { OpenAiClient } from '../src/llm/openai-client.js'

describe('OpenAiClient', () => {
  const prevKey = process.env.OPENAI_API_KEY

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'sk-test'
  })

  afterEach(() => {
    process.env.OPENAI_API_KEY = prevKey
  })

  it('executes tool calls and returns final text', async () => {
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '',
                tool_calls: [{ id: 'tc1', function: { name: 'read_file', arguments: '{"path":"a.txt"}' } }]
              }
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'done', tool_calls: [] } }]
        })
      })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async (call: any) => {
        expect(call.name).toBe('read_file')
        return 'hello'
      })
    }

    const client = await OpenAiClient.create('gpt-4o-mini')
    const res = await client.generateWithTools({ messages: [{ role: 'user', content: 'read' }], tools: tools as any, maxSteps: 4 })
    expect(res.outputText).toBe('done')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect((tools.execute as any).mock.calls.length).toBe(1)

    ;(globalThis as any).fetch = prevFetch
  })

  it('throws on non-ok http response', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'bad'
    })
    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const client = await OpenAiClient.create('gpt-4o-mini')
    await expect(
      client.generateWithTools({
        messages: [{ role: 'user', content: 'x' }],
        tools: { list: () => [], execute: async () => '' } as any,
        maxSteps: 1
      })
    ).rejects.toThrow(/OpenAI request failed/)

    ;(globalThis as any).fetch = prevFetch
  })

  it('streams text', async () => {
    const sse = [
      'data: {"choices":[{"delta":{"content":"he"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"llo"}}]}\n\n',
      'data: [DONE]\n\n'
    ].join('')
    const bytes = new TextEncoder().encode(sse)
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
    expect(res.outputText).toBe('hello')
    expect(deltas.join('')).toBe('hello')

    ;(globalThis as any).fetch = prevFetch
  })

  it('streams tool calls', async () => {
    const sse1 = [
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"tc1","function":{"name":"read_file","arguments":"{\\"path\\":\\"a.txt\\"}"}}]}}]}\n\n',
      'data: [DONE]\n\n'
    ].join('')
    const sse2 = ['data: {"choices":[{"delta":{"content":"done"}}]}\n\n', 'data: [DONE]\n\n'].join('')

    const bytes1 = new TextEncoder().encode(sse1)
    const bytes2 = new TextEncoder().encode(sse2)
    let used1 = false
    let used2 = false

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => ({
            read: async () => {
              if (used1) return { done: true, value: undefined }
              used1 = true
              return { done: false, value: bytes1 }
            }
          })
        }
      })
      .mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => ({
            read: async () => {
              if (used2) return { done: true, value: undefined }
              used2 = true
              return { done: false, value: bytes2 }
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
      execute: vi.fn(async (call: any) => {
        expect(call.name).toBe('read_file')
        return 'hello'
      })
    }

    const client = await OpenAiClient.create('gpt-4o-mini')
    const res = await client.streamWithTools!({
      messages: [{ role: 'user', content: 'read' }],
      tools: tools as any,
      onText: () => undefined,
      maxSteps: 2
    })
    expect(res.outputText).toBe('done')
    expect((tools.execute as any).mock.calls.length).toBe(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    ;(globalThis as any).fetch = prevFetch
  })

  it('errors when stream body is missing', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, body: null })
    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const client = await OpenAiClient.create('gpt-4o-mini')
    await expect(
      client.streamWithTools!({
        messages: [{ role: 'user', content: 'x' }],
        tools: { list: () => [], execute: async () => '' } as any,
        onText: () => undefined,
        maxSteps: 1
      })
    ).rejects.toThrow(/missing body/)

    ;(globalThis as any).fetch = prevFetch
  })
})
