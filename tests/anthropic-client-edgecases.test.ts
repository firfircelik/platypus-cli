import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { AnthropicClient } from '../src/llm/anthropic-client.js'
import { KeyStore } from '../src/crypto/key-store.js'

describe('AnthropicClient Edge Cases', () => {
  const prevKey = process.env.ANTHROPIC_API_KEY
  let ksMock: any
  let getKeyMock: any

  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY
    ksMock = vi.spyOn(KeyStore.prototype, 'initialize').mockResolvedValue(undefined)
    getKeyMock = vi.spyOn(KeyStore.prototype, 'getKey').mockResolvedValue('ak-keystore-key')
  })

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = prevKey
    ksMock?.mockRestore()
    getKeyMock?.mockRestore()
  })

  it('creates client using KeyStore when env var is not set', async () => {
    const client = await AnthropicClient.create('claude-3-5-sonnet-20241022')
    expect(client).toBeInstanceOf(AnthropicClient)
  })

  it('throws when Anthropic API returns non-ok response', async () => {
    process.env.ANTHROPIC_API_KEY = 'ak-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'bad key'
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [],
      execute: vi.fn(async () => 'content')
    }

    const client = await AnthropicClient.create('claude-3-5-sonnet-20241022')
    await expect(
      client.generateWithTools({ messages: [{ role: 'user', content: 'hi' }], tools: tools as any, maxSteps: 1 })
    ).rejects.toThrow('Anthropic request failed: 401 Unauthorized: bad key')

    ;(globalThis as any).fetch = prevFetch
    delete process.env.ANTHROPIC_API_KEY
  })

  it('handles content with both text and tool_use blocks', async () => {
    process.env.ANTHROPIC_API_KEY = 'ak-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          { type: 'text', text: 'I will read the file for you.' },
          { type: 'tool_use', id: 'tu1', name: 'read_file', input: { path: 'a.txt' } }
        ]
      })
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async () => 'content')
    }

    const client = await AnthropicClient.create('claude-3-5-sonnet-20241022')
    const res = await client.generateWithTools({ messages: [{ role: 'user', content: 'read file' }], tools: tools as any, maxSteps: 2 })
    const assistantMsg = res.newMessages.find(m => m.role === 'assistant')
    expect(assistantMsg?.content).toBe('I will read the file for you.')
    expect(assistantMsg?.toolCalls?.length).toBe(1)

    ;(globalThis as any).fetch = prevFetch
    delete process.env.ANTHROPIC_API_KEY
  })

  it('handles malformed tool_use input gracefully', async () => {
    process.env.ANTHROPIC_API_KEY = 'ak-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          { type: 'tool_use', id: 'tu1', name: 'read_file', input: { path: 'a.txt', extra: null } }
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

    const client = await AnthropicClient.create('claude-3-5-sonnet-20241022')
    await client.generateWithTools({ messages: [{ role: 'user', content: 'read' }], tools: tools as any, maxSteps: 2 })

    ;(globalThis as any).fetch = prevFetch
    delete process.env.ANTHROPIC_API_KEY
  })

  it('handles response with missing id in tool_use', async () => {
    process.env.ANTHROPIC_API_KEY = 'ak-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          { type: 'tool_use', name: 'read_file', input: { path: 'a.txt' } }
        ]
      })
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async () => 'content')
    }

    const client = await AnthropicClient.create('claude-3-5-sonnet-20241022')
    const res = await client.generateWithTools({ messages: [{ role: 'user', content: 'read' }], tools: tools as any, maxSteps: 2 })
    const assistantMsg = res.newMessages.find(m => m.role === 'assistant')
    expect(assistantMsg?.toolCalls?.[0].id).toBe('read_file-call')

    ;(globalThis as any).fetch = prevFetch
    delete process.env.ANTHROPIC_API_KEY
  })

  it('handles tool result messages without toolCallId', async () => {
    process.env.ANTHROPIC_API_KEY = 'ak-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'done' }]
      })
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async () => '')
    }

    const client = await AnthropicClient.create('claude-3-5-sonnet-20241022')
    await client.generateWithTools({
      messages: [{ role: 'tool', content: 'result' }],
      tools: tools as any,
      maxSteps: 1
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.messages).toContainEqual(
      expect.objectContaining({
        role: 'user',
        content: [expect.objectContaining({ type: 'tool_result', tool_use_id: 'tool_call' })]
      })
    )

    ;(globalThis as any).fetch = prevFetch
    delete process.env.ANTHROPIC_API_KEY
  })

  it('converts assistant messages with both content and tool calls', async () => {
    process.env.ANTHROPIC_API_KEY = 'ak-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'done' }]
      })
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async () => '')
    }

    const client = await AnthropicClient.create('claude-3-5-sonnet-20241022')
    await client.generateWithTools({
      messages: [{ role: 'assistant', content: 'thinking', toolCalls: [{ id: 'tu1', name: 'read_file', arguments: '{"path":"a.txt"}' }] }],
      tools: tools as any,
      maxSteps: 1
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    const assistantMsg = body.messages.find((m: any) => m.role === 'assistant')
    expect(assistantMsg.content).toHaveLength(2)
    expect(assistantMsg.content[0]).toHaveProperty('type', 'text')
    expect(assistantMsg.content[1]).toHaveProperty('type', 'tool_use')

    ;(globalThis as any).fetch = prevFetch
    delete process.env.ANTHROPIC_API_KEY
  })

  it('handles assistant message with empty content', async () => {
    process.env.ANTHROPIC_API_KEY = 'ak-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'done' }]
      })
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async () => '')
    }

    const client = await AnthropicClient.create('claude-3-5-sonnet-20241022')
    await client.generateWithTools({
      messages: [{ role: 'assistant', content: '', toolCalls: [{ id: 'tu1', name: 'read_file', arguments: '{"path":"a.txt"}' }] }],
      tools: tools as any,
      maxSteps: 1
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    const assistantMsg = body.messages.find((m: any) => m.role === 'assistant')
    expect(assistantMsg.content).toHaveLength(1)
    expect(assistantMsg.content[0]).toHaveProperty('type', 'tool_use')

    ;(globalThis as any).fetch = prevFetch
    delete process.env.ANTHROPIC_API_KEY
  })

  it('handles response with non-array content', async () => {
    process.env.ANTHROPIC_API_KEY = 'ak-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: 'plain text'
      })
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [],
      execute: vi.fn(async () => '')
    }

    const client = await AnthropicClient.create('claude-3-5-sonnet-20241022')
    const res = await client.generateWithTools({ messages: [{ role: 'user', content: 'hi' }], tools: tools as any, maxSteps: 1 })
    expect(res.outputText).toBe('')
    expect(res.newMessages).toHaveLength(0)

    ;(globalThis as any).fetch = prevFetch
    delete process.env.ANTHROPIC_API_KEY
  })

  it('handles response with empty content array', async () => {
    process.env.ANTHROPIC_API_KEY = 'ak-test'
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: []
      })
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [],
      execute: vi.fn(async () => '')
    }

    const client = await AnthropicClient.create('claude-3-5-sonnet-20241022')
    const res = await client.generateWithTools({ messages: [{ role: 'user', content: 'hi' }], tools: tools as any, maxSteps: 1 })
    expect(res.outputText).toBe('')
    expect(res.newMessages).toHaveLength(0)

    ;(globalThis as any).fetch = prevFetch
    delete process.env.ANTHROPIC_API_KEY
  })

  it('stops after max steps and returns partial text', async () => {
    process.env.ANTHROPIC_API_KEY = 'ak-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'tool_use', id: 'tu1', name: 'read_file', input: { path: 'a.txt' } }]
      })
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async () => 'content')
    }

    const client = await AnthropicClient.create('claude-3-5-sonnet-20241022')
    const res = await client.generateWithTools({ messages: [{ role: 'user', content: 'read' }], tools: tools as any, maxSteps: 2 })
    expect(res.outputText).toBe('Stopped (max steps reached).')

    ;(globalThis as any).fetch = prevFetch
    delete process.env.ANTHROPIC_API_KEY
  })

  it('handles multiple tool calls in one response', async () => {
    process.env.ANTHROPIC_API_KEY = 'ak-test'
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            { type: 'tool_use', id: 'tu1', name: 'read_file', input: { path: 'a.txt' } },
            { type: 'tool_use', id: 'tu2', name: 'read_file', input: { path: 'b.txt' } }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'Done reading files.' }]
        })
      })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async () => 'content')
    }

    const client = await AnthropicClient.create('claude-3-5-sonnet-20241022')
    const res = await client.generateWithTools({ messages: [{ role: 'user', content: 'read both files' }], tools: tools as any, maxSteps: 2 })
    expect(tools.execute as any).toHaveBeenCalledTimes(2)

    ;(globalThis as any).fetch = prevFetch
    delete process.env.ANTHROPIC_API_KEY
  })

  it('handles non-array content in extractText (line 97-98)', async () => {
    process.env.ANTHROPIC_API_KEY = 'ak-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: 'plain string content'
      })
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async () => 'content')
    }

    const client = await AnthropicClient.create('claude-3-5-sonnet-20241022')
    const res = await client.generateWithTools({ messages: [{ role: 'user', content: 'hi' }], tools: tools as any, maxSteps: 1 })
    expect(res.outputText).toBe('')
    expect(res.newMessages).toHaveLength(0)

    ;(globalThis as any).fetch = prevFetch
    delete process.env.ANTHROPIC_API_KEY
  })

  it('handles non-array content in extractToolUses (line 121-122)', async () => {
    process.env.ANTHROPIC_API_KEY = 'ak-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: 'plain string response'
      })
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async () => 'content')
    }

    const client = await AnthropicClient.create('claude-3-5-sonnet-20241022')
    const res = await client.generateWithTools({ messages: [{ role: 'user', content: 'hi' }], tools: tools as any, maxSteps: 1 })
    expect(res.outputText).toBe('')
    expect(res.newMessages).toHaveLength(0)

    ;(globalThis as any).fetch = prevFetch
    delete process.env.ANTHROPIC_API_KEY
  })

  it('handles non-string input in safeJsonParse (line 154)', async () => {
    process.env.ANTHROPIC_API_KEY = 'ak-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'done' }]
      })
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async () => 'content')
    }

    const client = await AnthropicClient.create('claude-3-5-sonnet-20241022')
    await client.generateWithTools({
      messages: [{ role: 'assistant', content: 'thinking', toolCalls: [{ id: 'tc1', name: 'read_file', arguments: { path: 'a.txt' } as any }] }],
      tools: tools as any,
      maxSteps: 1
    })

    const payload = JSON.parse(fetchMock.mock.calls[0][1].body)
    const assistantMsg = payload.messages.find((m: any) => m.role === 'assistant')
    const toolUse = assistantMsg.content.find((b: any) => b.type === 'tool_use')
    expect(toolUse.input).toEqual({})

    ;(globalThis as any).fetch = prevFetch
    delete process.env.ANTHROPIC_API_KEY
  })

  it('handles array JSON value in safeJsonParse (line 156)', async () => {
    process.env.ANTHROPIC_API_KEY = 'ak-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'done' }]
      })
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async () => 'content')
    }

    const client = await AnthropicClient.create('claude-3-5-sonnet-20241022')
    await client.generateWithTools({
      messages: [{ role: 'assistant', content: 'thinking', toolCalls: [{ id: 'tc1', name: 'read_file', arguments: '[1,2,3]' }] }],
      tools: tools as any,
      maxSteps: 1
    })

    const payload = JSON.parse(fetchMock.mock.calls[0][1].body)
    const assistantMsg = payload.messages.find((m: any) => m.role === 'assistant')
    const toolUse = assistantMsg.content.find((b: any) => b.type === 'tool_use')
    expect(toolUse.input).toEqual([1, 2, 3])

    ;(globalThis as any).fetch = prevFetch
    delete process.env.ANTHROPIC_API_KEY
  })

  it('handles invalid JSON string in safeJsonParse (line 156)', async () => {
    process.env.ANTHROPIC_API_KEY = 'ak-test'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'done' }]
      })
    })

    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = fetchMock

    const tools = {
      list: () => [{ name: 'read_file', description: 'x', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
      execute: vi.fn(async () => 'content')
    }

    const client = await AnthropicClient.create('claude-3-5-sonnet-20241022')
    await client.generateWithTools({
      messages: [{ role: 'assistant', content: 'thinking', toolCalls: [{ id: 'tc1', name: 'read_file', arguments: '{bad' }] }],
      tools: tools as any,
      maxSteps: 1
    })

    const payload = JSON.parse(fetchMock.mock.calls[0][1].body)
    const assistantMsg = payload.messages.find((m: any) => m.role === 'assistant')
    const toolUse = assistantMsg.content.find((b: any) => b.type === 'tool_use')
    expect(toolUse.input).toEqual({})

    ;(globalThis as any).fetch = prevFetch
    delete process.env.ANTHROPIC_API_KEY
  })
})
