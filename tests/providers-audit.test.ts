import { describe, expect, it, vi } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { validateProviderKey } from '../src/crypto/providers.js'
import { AuditLogger } from '../src/core/audit.js'

describe('Providers and audit', () => {
  it('validates unknown providers as valid', async () => {
    const res = await validateProviderKey('custom', 'k')
    expect(res.valid).toBe(true)
  })

  it('validates openai with mocked fetch', async () => {
    const original = globalThis.fetch
    globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200 })) as any
    const res = await validateProviderKey('openai', 'sk-x')
    expect(res.valid).toBe(true)
    globalThis.fetch = original
  })

  it('writes audit log', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-audit-'))
    const logPath = path.join(tmpDir, 'audit.log')
    const audit = new AuditLogger(logPath)
    const entry = audit.write({ agentId: 'a', action: 'x', resource: 'r', details: {} })
    const content = fs.readFileSync(logPath, 'utf8')
    expect(content).toContain(entry.id)
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})
