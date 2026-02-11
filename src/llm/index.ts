import type { LlmClient } from './client.js'
import { OpenAiClient } from './openai-client.js'
import { AnthropicClient } from './anthropic-client.js'
import { GoogleClient } from './google-client.js'

export type CreateLlmClientInput = {
  provider: string
  model?: string
}

export async function createLlmClient(input: CreateLlmClientInput): Promise<LlmClient> {
  const provider = input.provider.trim().toLowerCase()
  if (provider === 'openai') return OpenAiClient.create(input.model)
  if (provider === 'anthropic') return AnthropicClient.create(input.model)
  if (provider === 'google') return GoogleClient.create(input.model)
  throw new Error(`Unsupported provider: ${provider}`)
}
