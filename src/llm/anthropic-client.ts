import type { LlmClient } from './client.js'
import type { GenerateWithToolsInput, GenerateWithToolsResult, LlmMessage, ToolCall } from './types.js'
import { KeyStore } from '../crypto/key-store.js'

type AnthropicMessage = { role: 'user' | 'assistant'; content: string | any[] }

export class AnthropicClient implements LlmClient {
  private apiKey: string
  private model: string
  private baseUrl: string

  constructor(apiKey: string, model: string, baseUrl: string = 'https://api.anthropic.com/v1') {
    this.apiKey = apiKey
    this.model = model
    this.baseUrl = baseUrl
  }

  static async create(model?: string): Promise<AnthropicClient> {
    const envKey = process.env.ANTHROPIC_API_KEY
    const apiKey = envKey && envKey.trim().length > 0 ? envKey.trim() : await AnthropicClient.loadFromKeyStore()
    const m = model ?? process.env.ANTHROPIC_MODEL ?? process.env.PLATYPUS_MODEL ?? 'claude-3-5-sonnet-20241022'
    return new AnthropicClient(apiKey, m)
  }

  private static async loadFromKeyStore(): Promise<string> {
    const ks = new KeyStore()
    await ks.initialize()
    return ks.getKey('anthropic')
  }

  async generateWithTools(input: GenerateWithToolsInput): Promise<GenerateWithToolsResult> {
    const maxSteps = input.maxSteps ?? 8
    const newMessages: LlmMessage[] = []

    let history = input.messages.slice()
    for (let step = 0; step < maxSteps; step++) {
      const response = await this.callMessages({
        messages: this.toAnthropicMessages(history),
        tools: input.tools.list()
      })

      const assistantText = AnthropicClient.extractText(response.content)
      const toolCalls = AnthropicClient.extractToolUses(response.content)

      if (toolCalls.length === 0) {
        if (assistantText.trim().length > 0) {
          const m: LlmMessage = { role: 'assistant', content: assistantText }
          newMessages.push(m)
          history = history.concat([m])
        }
        return { outputText: assistantText, newMessages }
      }

      const assistantMsg: LlmMessage = {
        role: 'assistant',
        content: assistantText,
        toolCalls: toolCalls.map(tc => ({ id: tc.id, name: tc.name, arguments: tc.arguments }))
      }
      newMessages.push(assistantMsg)
      history = history.concat([assistantMsg])

      for (const tc of toolCalls) {
        const parsedArgs = AnthropicClient.safeJsonParse(tc.arguments) ?? {}
        const call: ToolCall = { id: tc.id, name: tc.name, arguments: parsedArgs }
        const out = await input.tools.execute(call)
        const toolMsg: LlmMessage = { role: 'tool', content: out, toolCallId: call.id, name: call.name }
        newMessages.push(toolMsg)
        history = history.concat([toolMsg])
      }
    }

    return { outputText: 'Stopped (max steps reached).', newMessages }
  }

  private async callMessages(input: { messages: AnthropicMessage[]; tools: any[] }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system: 'You are a coding assistant. Use tools when needed. Keep responses concise.',
        messages: input.messages,
        tools: input.tools.map(t => ({
          name: t.name,
          description: t.description,
          input_schema: t.parameters
        }))
      })
    })

    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`Anthropic request failed: ${res.status} ${res.statusText}${txt ? `: ${txt}` : ''}`)
    }
    return res.json()
  }

  private toAnthropicMessages(messages: LlmMessage[]): AnthropicMessage[] {
    const out: AnthropicMessage[] = []
    for (const m of messages) {
      if (m.role === 'user') {
        out.push({ role: 'user', content: m.content })
        continue
      }
      if (m.role === 'assistant') {
        if (m.toolCalls && m.toolCalls.length > 0) {
          const blocks: any[] = []
          if (m.content.trim().length > 0) blocks.push({ type: 'text', text: m.content })
          for (const tc of m.toolCalls) {
            const parsed = AnthropicClient.safeJsonParse(tc.arguments) ?? {}
            blocks.push({ type: 'tool_use', id: tc.id, name: tc.name, input: parsed })
          }
          out.push({ role: 'assistant', content: blocks })
          continue
        }
        out.push({ role: 'assistant', content: m.content })
        continue
      }
      const toolId = m.toolCallId ?? 'tool_call'
      out.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: toolId, content: m.content }] })
    }
    return out
  }

  private static extractText(content: any): string {
    if (!Array.isArray(content)) return ''
    return content
      .filter((b: any) => b?.type === 'text' && typeof b.text === 'string')
      .map((b: any) => b.text)
      .join('')
  }

  private static extractToolUses(content: any): { id: string; name: string; arguments: string }[] {
    if (!Array.isArray(content)) return []
    return content
      .filter((b: any) => b?.type === 'tool_use' && typeof b.name === 'string')
      .map((b: any) => ({
        id: String(b.id ?? `${b.name}-call`),
        name: String(b.name),
        arguments: JSON.stringify(b.input ?? {})
      }))
  }

  private static safeJsonParse(text: unknown): Record<string, unknown> | null {
    if (typeof text !== 'string') return null
    try {
      const parsed = JSON.parse(text)
      if (parsed && typeof parsed === 'object') return parsed as any
      return null
    } catch {
      return null
    }
  }
}
