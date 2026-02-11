import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/crypto/key-store.js', () => ({
  KeyStore: class {
    initialize = vi.fn(async () => undefined)
  }
}))

vi.mock('../src/core/audit.js', () => ({
  AuditLogger: class {
    write = vi.fn()
  }
}))

import { BaseCommand } from '../src/cli/base-command.js'

class TestCommand extends BaseCommand {
  async run(): Promise<void> {
    return
  }
}

describe('BaseCommand', () => {
  it('provides service instances', async () => {
    const cmd = new TestCommand([], {} as any)
    const keyStore = await (cmd as any).getKeyStore()
    expect(keyStore).toBeTruthy()
    expect((keyStore as any).initialize).toBeDefined()
    expect((cmd as any).getAgentFactory()).toBeTruthy()
    expect((cmd as any).getAgentStore()).toBeTruthy()
    expect((cmd as any).getTmuxManager()).toBeTruthy()
    expect((cmd as any).getOrchestrator()).toBeTruthy()
    expect((cmd as any).getAudit()).toBeTruthy()
  })
})
