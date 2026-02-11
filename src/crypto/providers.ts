import type { KeyValidationResult } from '../types/crypto.types.js'

export type ProviderId = 'openai' | 'anthropic' | 'google' | 'custom'

export async function validateProviderKey(provider: string, apiKey: string): Promise<KeyValidationResult> {
  switch (provider) {
    case 'openai':
      return validateOpenAI(apiKey)
    default:
      return { valid: true, provider }
  }
}

async function validateOpenAI(apiKey: string): Promise<KeyValidationResult> {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    })
    if (!res.ok) {
      return { valid: false, provider: 'openai', error: `HTTP ${res.status}` }
    }
    return { valid: true, provider: 'openai' }
  } catch (error) {
    return { valid: false, provider: 'openai', error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

