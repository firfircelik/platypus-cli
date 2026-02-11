import { describe, expect, it } from 'vitest'
import { createLlmClient } from '../src/llm/index.js'

describe('llm index', () => {
  it('creates clients for supported providers', async () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    process.env.ANTHROPIC_API_KEY = 'ak-test'
    process.env.GOOGLE_API_KEY = 'gk-test'

    expect(await createLlmClient({ provider: 'openai', model: 'gpt-4o-mini' })).toBeTruthy()
    expect(await createLlmClient({ provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' })).toBeTruthy()
    expect(await createLlmClient({ provider: 'google', model: 'gemini-1.5-flash' })).toBeTruthy()
  })
})

