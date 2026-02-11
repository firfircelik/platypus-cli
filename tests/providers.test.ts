import { describe, expect, it, vi } from 'vitest'
import { validateProviderKey } from '../src/crypto/providers.js'

describe('provider validation', () => {
  it('defaults to valid for unknown providers', async () => {
    const res = await validateProviderKey('custom', 'x')
    expect(res.valid).toBe(true)
  })

  it('validates openai key on ok response', async () => {
    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = vi.fn(async () => ({ ok: true, status: 200 }))
    const res = await validateProviderKey('openai', 'sk-test')
    expect(res.valid).toBe(true)
    ;(globalThis as any).fetch = prevFetch
  })

  it('returns invalid on non-ok response', async () => {
    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = vi.fn(async () => ({ ok: false, status: 401 }))
    const res = await validateProviderKey('openai', 'sk-test')
    expect(res.valid).toBe(false)
    expect(res.error).toContain('HTTP')
    ;(globalThis as any).fetch = prevFetch
  })

  it('returns invalid on fetch error', async () => {
    const prevFetch = globalThis.fetch
    ;(globalThis as any).fetch = vi.fn(async () => {
      throw new Error('no net')
    })
    const res = await validateProviderKey('openai', 'sk-test')
    expect(res.valid).toBe(false)
    ;(globalThis as any).fetch = prevFetch
  })
})

