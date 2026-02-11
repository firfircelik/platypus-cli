import type { LlmClient } from './client.js'
import type { GenerateWithToolsInput, GenerateWithToolsResult, LlmMessage, ToolCall } from './types.js'
import { KeyStore } from '../crypto/key-store.js'
import { v4 as uuidv4 } from 'uuid'

type GeminiContent = { role: 'user' | 'model'; parts: any[] }

export class GoogleClient implements LlmClient {
  private apiKey: string
  private model: string
  private baseUrl: string

  constructor(apiKey: string, model: string, baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta') {
    this.apiKey = apiKey
    this.model = model
    this.baseUrl = baseUrl
  }

  static async create(model?: string): Promise<GoogleClient> {
    const envKey = process.env.GOOGLE_API_KEY
    const apiKey = envKey && envKey.trim().length > 0 ? envKey.trim() : await GoogleClient.loadFromKeyStore()
    const m = model ?? process.env.GOOGLE_MODEL ?? process.env.PLATYPUS_MODEL ?? 'gemini-1.5-flash'
    return new GoogleClient(apiKey, m)
  }

  private static async loadFromKeyStore(): Promise<string> {
    const ks = new KeyStore()
    await ks.initialize()
    return ks.getKey('google')
  }

  async generateWithTools(input: GenerateWithToolsInput): Promise<GenerateWithToolsResult> {
    const maxSteps = input.maxSteps ?? 8
    const newMessages: LlmMessage[] = []

    let history = input.messages.slice()
    for (let step = 0; step < maxSteps; step++) {
      const response = await this.callGenerateContent({
        contents: this.toGeminiContents(history),
        tools: input.tools.list()
      })

      const parts = response?.candidates?.[0]?.content?.parts ?? []
      const assistantText = parts.filter((p: any) => typeof p?.text === 'string').map((p: any) => p.text).join('')
      const calls = parts
        .filter((p: any) => p?.functionCall?.name)
        .map((p: any) => ({
          id: uuidv4(),
          name: String(p.functionCall.name),
          arguments: JSON.stringify(p.functionCall.args ?? {})
        }))

      if (calls.length === 0) {
        if (assistantText.trim().length > 0) {
          const m: LlmMessage = { role: 'assistant', content: assistantText }
          newMessages.push(m)
          history = history.concat([m])
        }
        return { outputText: assistantText, newMessages }
      }

      const assistantMsg: LlmMessage = { role: 'assistant', content: assistantText, toolCalls: calls }
      newMessages.push(assistantMsg)
      history = history.concat([assistantMsg])

      for (const tc of calls) {
        const parsedArgs = GoogleClient.safeJsonParse(tc.arguments) ?? {}
        const call: ToolCall = { id: tc.id, name: tc.name, arguments: parsedArgs }
        const out = await input.tools.execute(call)
        const toolMsg: LlmMessage = { role: 'tool', content: out, toolCallId: call.id, name: call.name }
        newMessages.push(toolMsg)
        history = history.concat([toolMsg])
      }
    }

    return { outputText: 'Stopped (max steps reached).', newMessages }
  }

  private async callGenerateContent(input: { contents: GeminiContent[]; tools: any[] }): Promise<any> {
    const url = `${this.baseUrl}/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: 'You are a coding assistant. Use tools when needed. Keep responses concise.' }] },
        contents: input.contents,
        tools: [
          {
            functionDeclarations: input.tools.map(t => ({
              name: t.name,
              description: t.description,
              parameters: t.parameters
            }))
          }
        ]
      })
    })

    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`Google request failed: ${res.status} ${res.statusText}${txt ? `: ${txt}` : ''}`)
    }
    return res.json()
  }

  private toGeminiContents(messages: LlmMessage[]): GeminiContent[] {
    const out: GeminiContent[] = []
    for (const m of messages) {
      if (m.role === 'user') {
        out.push({ role: 'user', parts: [{ text: m.content }] })
        continue
      }
      if (m.role === 'assistant') {
        const parts: any[] = []
        if (m.content.trim().length > 0) parts.push({ text: m.content })
        if (m.toolCalls && m.toolCalls.length > 0) {
          for (const tc of m.toolCalls) {
            const parsed = GoogleClient.safeJsonParse(tc.arguments) ?? {}
            parts.push({ functionCall: { name: tc.name, args: parsed } })
          }
        }
        out.push({ role: 'model', parts })
        continue
      }
      out.push({ role: 'user', parts: [{ functionResponse: { name: m.name ?? 'tool', response: { output: m.content } } }] })
    }
    return out
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
