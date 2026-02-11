import { describe, expect, it, vi } from 'vitest'
import KeysAdd from '../src/cli/commands/keys/add.js'
import KeysList from '../src/cli/commands/keys/list.js'
import KeysRemove from '../src/cli/commands/keys/remove.js'
import KeysValidate from '../src/cli/commands/keys/validate.js'
import { validateProviderKey } from '../src/crypto/providers.js'

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(async () => ({ apiKey: 'sk-test-1234567890abcdef' }))
  }
}))

vi.mock('../src/crypto/providers.js', () => ({
  validateProviderKey: vi.fn(async (provider: string) => ({ valid: true, provider }))
}))

describe('CLI keys commands', () => {
  it('keys add stores key', async () => {
    const store = { initialize: vi.fn(), storeKey: vi.fn(async () => undefined) }
    const cmd = new KeysAdd([], {} as any)
    ;(cmd as any).parse = vi.fn(async () => ({ flags: { provider: 'openai', key: 'sk-test-1234567890abcdef', validate: true } }))
    ;(cmd as any).getKeyStore = vi.fn(async () => store)
    ;(cmd as any).log = vi.fn()
    await cmd.run()
    expect(store.storeKey).toHaveBeenCalledWith('openai', 'sk-test-1234567890abcdef')
  })

  it('keys add prompts when key omitted', async () => {
    const store = { initialize: vi.fn(), storeKey: vi.fn(async () => undefined) }
    const cmd = new KeysAdd([], {} as any)
    ;(cmd as any).parse = vi.fn(async () => ({ flags: { provider: 'openai', key: undefined, validate: false } }))
    ;(cmd as any).getKeyStore = vi.fn(async () => store)
    ;(cmd as any).log = vi.fn()
    await cmd.run()
    expect(store.storeKey).toHaveBeenCalled()
  })

  it('keys list prints stored providers', async () => {
    const store = {
      initialize: vi.fn(),
      listKeys: vi.fn(async () => [
        { provider: 'openai', keyId: 'abc', valid: true, updatedAt: new Date('2026-01-01T00:00:00.000Z') }
      ])
    }
    const cmd = new KeysList([], {} as any)
    ;(cmd as any).getKeyStore = vi.fn(async () => store)
    const out: string[] = []
    ;(cmd as any).log = (s: string) => out.push(s)
    await cmd.run()
    expect(out.some(l => l.includes('openai'))).toBe(true)
  })

  it('keys list prints empty message when none stored', async () => {
    const store = { initialize: vi.fn(), listKeys: vi.fn(async () => []) }
    const cmd = new KeysList([], {} as any)
    ;(cmd as any).getKeyStore = vi.fn(async () => store)
    const out: string[] = []
    ;(cmd as any).log = (s: string) => out.push(s)
    await cmd.run()
    expect(out.join('\n')).toContain('No keys')
  })

  it('keys remove deletes key', async () => {
    const store = { initialize: vi.fn(), deleteKey: vi.fn(async () => undefined) }
    const cmd = new KeysRemove([], {} as any)
    ;(cmd as any).parse = vi.fn(async () => ({ flags: { provider: 'openai' } }))
    ;(cmd as any).getKeyStore = vi.fn(async () => store)
    ;(cmd as any).log = vi.fn()
    await cmd.run()
    expect(store.deleteKey).toHaveBeenCalledWith('openai')
  })

  it('keys validate validates key', async () => {
    const store = {
      initialize: vi.fn(),
      getKey: vi.fn(async () => 'sk-test-1234567890abcdef'),
      validateKey: vi.fn(async () => ({ valid: true, provider: 'openai' }))
    }
    const cmd = new KeysValidate([], {} as any)
    ;(cmd as any).parse = vi.fn(async () => ({ flags: { provider: 'openai' } }))
    ;(cmd as any).getKeyStore = vi.fn(async () => store)
    ;(cmd as any).log = vi.fn()
    await cmd.run()
    expect(store.getKey).toHaveBeenCalledWith('openai')
    expect(store.validateKey).toHaveBeenCalled()
  })

  it('keys validate errors when invalid', async () => {
    ;(validateProviderKey as any).mockImplementationOnce(async () => ({ valid: false, provider: 'openai', error: 'bad' }))
    const store = {
      initialize: vi.fn(),
      getKey: vi.fn(async () => 'sk-test-1234567890abcdef'),
      validateKey: vi.fn(async () => ({ valid: false, provider: 'openai' }))
    }
    const cmd = new KeysValidate([], {} as any)
    ;(cmd as any).parse = vi.fn(async () => ({ flags: { provider: 'openai' } }))
    ;(cmd as any).getKeyStore = vi.fn(async () => store)
    ;(cmd as any).error = (m: string) => {
      throw new Error(m)
    }
    await expect(cmd.run()).rejects.toThrow(/Invalid key/)
  })
})
