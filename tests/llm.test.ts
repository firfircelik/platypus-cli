import { describe, expect, it } from 'vitest'
import { createLlmClient } from '../src/llm/index.js'
import { LLM_ROLES } from '../src/llm/types.js'
import { asLlmClient } from '../src/llm/client.js'

describe('llm', () => {
  it('rejects unsupported providers', async () => {
    await expect(createLlmClient({ provider: 'nope' })).rejects.toThrow(/Unsupported provider/)
  })

  it('exposes roles and helpers', () => {
    expect(LLM_ROLES.includes('user')).toBe(true)
    expect(asLlmClient({ generateWithTools: async () => ({ outputText: '', newMessages: [] }) })).toBeTruthy()
  })
})
