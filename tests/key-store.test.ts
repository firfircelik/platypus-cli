import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { KeyStore } from '../src/crypto/key-store.js'

vi.mock('keytar', () => {
  let value: string | null = null
  return {
    default: {
      getPassword: vi.fn(async () => value),
      setPassword: vi.fn(async (_service: string, _account: string, password: string) => {
        value = password
      })
    }
  }
})

describe('KeyStore', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('encrypts, stores, and retrieves key', async () => {
    const dbPath = path.join(tmpDir, 'keys.db')
    const ks = new KeyStore(undefined, dbPath)
    await ks.initialize()

    await ks.storeKey('openai', 'sk-test-1234567890abcdef')
    const key = await ks.getKey('openai')

    expect(key).toBe('sk-test-1234567890abcdef')
    ks.close()
  })

  it('rejects invalid provider', async () => {
    const dbPath = path.join(tmpDir, 'keys.db')
    const ks = new KeyStore(undefined, dbPath)
    await ks.initialize()
    await expect(ks.storeKey('BAD PROVIDER', 'sk-test-1234567890abcdef')).rejects.toThrow(/Invalid provider/)
    ks.close()
  })

  it('rejects invalid api key length', async () => {
    const dbPath = path.join(tmpDir, 'keys.db')
    const ks = new KeyStore(undefined, dbPath)
    await ks.initialize()
    await expect(ks.storeKey('openai', 'short')).rejects.toThrow(/Invalid API key length/)
    ks.close()
  })

  it('validates key with custom validator', async () => {
    const dbPath = path.join(tmpDir, 'keys.db')
    const ks = new KeyStore(undefined, dbPath)
    await ks.initialize()
    await ks.storeKey('openai', 'sk-test-1234567890abcdef')
    const res = await ks.validateKey('openai', async () => false)
    expect(res.valid).toBe(false)
    const res2 = await ks.validateKey('openai')
    expect(res2.valid).toBe(true)
    await ks.rotateKey('openai')
    await expect(ks.deleteKey('missing')).rejects.toThrow(/No key found/)
    ks.close()
  })

  it('rejects store before initialize', async () => {
    const dbPath = path.join(tmpDir, 'keys.db')
    const ks = new KeyStore(undefined, dbPath)
    await expect(ks.storeKey('openai', 'sk-test-1234567890abcdef')).rejects.toThrow(/not initialized/i)
    ks.close()
  })

  it('returns invalid result when key missing during validation', async () => {
    const dbPath = path.join(tmpDir, 'keys.db')
    const ks = new KeyStore(undefined, dbPath)
    await ks.initialize()
    const res = await ks.validateKey('openai')
    expect(res.valid).toBe(false)
    ks.close()
  })

  it('supports scrypt derivation and non-gcm algorithm', async () => {
    const dbPath = path.join(tmpDir, 'keys2.db')
    const ks = new KeyStore({ algorithm: 'aes-256-cbc', keyDerivation: 'scrypt', iterations: 100000, saltLength: 32 }, dbPath)
    await ks.initialize()
    await ks.storeKey('openai', 'sk-test-1234567890abcdef')
    const key = await ks.getKey('openai')
    expect(key).toBe('sk-test-1234567890abcdef')
    ks.close()
  })

  it('supports listing keys with metadata', async () => {
    const dbPath = path.join(tmpDir, 'keys-list.db')
    const ks = new KeyStore(undefined, dbPath)
    await ks.initialize()
    await ks.storeKey('openai', 'sk-test-1234567890abcdef', { team: 'a' })
    const keys = await ks.listKeys()
    expect(keys.length).toBe(1)
    expect(keys[0].provider).toBe('openai')
    expect(keys[0].metadata).toEqual({ team: 'a' })
    ks.close()
  })

  it('rejects unsupported key derivation', async () => {
    const dbPath = path.join(tmpDir, 'keys-bad.db')
    const ks = new KeyStore({ algorithm: 'aes-256-gcm', keyDerivation: 'nope' as any, iterations: 1, saltLength: 32 }, dbPath)
    await ks.initialize()
    await expect(ks.storeKey('openai', 'sk-test-1234567890abcdef')).rejects.toThrow(/Unsupported key derivation/)
    ks.close()
  })

  it('rejects decrypt before initialize', async () => {
    const dbPath = path.join(tmpDir, 'keys-dec.db')
    const ks = new KeyStore(undefined, dbPath)
    await expect(
      ks.decryptKey({ version: 1, algorithm: 'aes-256-gcm', iv: '00', ciphertext: '00', tag: '00', salt: '00' } as any)
    ).rejects.toThrow(/not initialized/i)
    ks.close()
  })

  it('rejects non-string api keys', async () => {
    const dbPath = path.join(tmpDir, 'keys.db')
    const ks = new KeyStore(undefined, dbPath)
    await ks.initialize()
    await expect(ks.storeKey('openai', 123 as any)).rejects.toThrow(/must be a string/)
    ks.close()
  })
})
