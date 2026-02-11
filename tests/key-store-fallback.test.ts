import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

vi.mock('keytar', () => ({
  default: {
    getPassword: vi.fn(async () => {
      throw new Error('no keychain')
    }),
    setPassword: vi.fn(async () => {
      throw new Error('no keychain')
    })
  }
}))

describe('KeyStore fallback', () => {
  const prevHome = process.env.PLATYPUS_HOME
  const prevMaster = process.env.PLATYPUS_MASTER_KEY
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-ks-fb-'))
    process.env.PLATYPUS_HOME = tmpDir
    delete process.env.PLATYPUS_MASTER_KEY
  })

  afterEach(() => {
    if (prevHome === undefined) delete process.env.PLATYPUS_HOME
    else process.env.PLATYPUS_HOME = prevHome
    if (prevMaster === undefined) delete process.env.PLATYPUS_MASTER_KEY
    else process.env.PLATYPUS_MASTER_KEY = prevMaster
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('uses file master key when keychain is unavailable', async () => {
    const { KeyStore } = await import('../src/crypto/key-store.js')
    const dbPath = path.join(tmpDir, 'keys.db')
    const ks = new KeyStore(undefined, dbPath)
    await ks.initialize()
    await ks.storeKey('openai', 'sk-test-1234567890abcdef')
    const key = await ks.getKey('openai')
    expect(key).toBe('sk-test-1234567890abcdef')
    expect(fs.existsSync(path.join(tmpDir, 'state', 'master.key'))).toBe(true)
    ks.close()
  })

  it('uses env master key when provided', async () => {
    process.env.PLATYPUS_MASTER_KEY = 'a'.repeat(64)
    const { KeyStore } = await import('../src/crypto/key-store.js')
    const dbPath = path.join(tmpDir, 'keys2.db')
    const ks = new KeyStore(undefined, dbPath)
    await ks.initialize()
    await ks.storeKey('openai', 'sk-test-1234567890abcdef')
    expect(await ks.getKey('openai')).toBe('sk-test-1234567890abcdef')
    expect(fs.existsSync(path.join(tmpDir, 'state', 'master.key'))).toBe(false)
    ks.close()
  })

  it('rejects invalid env master key length', async () => {
    process.env.PLATYPUS_MASTER_KEY = 'a'.repeat(10)
    const { KeyStore } = await import('../src/crypto/key-store.js')
    const dbPath = path.join(tmpDir, 'keys3.db')
    const ks = new KeyStore(undefined, dbPath)
    await expect(ks.initialize()).rejects.toThrow(/PLATYPUS_MASTER_KEY/)
    ks.close()
  })
})
