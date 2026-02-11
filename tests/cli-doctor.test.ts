import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn((cmd: string) => {
    if (process.env.PLATYPUS_TEST_DOCTOR_FAIL === '1' && cmd === 'tmux') return { status: 1, stdout: '', stderr: 'missing' }
    return { status: 0, stdout: 'ok\n', stderr: '' }
  })
}))

vi.mock('../src/crypto/key-store.js', () => ({
  KeyStore: class {
    async initialize() {
      if (process.env.PLATYPUS_TEST_KEYCHAIN_FAIL === '1') throw new Error('no keychain')
    }
    close() {
      return
    }
  }
}))

import Doctor from '../src/cli/commands/doctor.js'

describe('doctor', () => {
  const prevHome = process.env.PLATYPUS_HOME
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-doctor-'))
    process.env.PLATYPUS_HOME = tmpDir
  })

  afterEach(() => {
    if (prevHome === undefined) delete process.env.PLATYPUS_HOME
    else process.env.PLATYPUS_HOME = prevHome
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('prints checks', async () => {
    const cmd = new Doctor([], {} as any)
    ;(cmd as any).log = vi.fn()
    ;(cmd as any).exit = vi.fn()
    await cmd.run()
    const text = (cmd as any).log.mock.calls.map((c: any[]) => c.join(' ')).join('\n')
    expect(text).toContain('node')
    expect((cmd as any).exit).not.toHaveBeenCalled()
  })

  it('exits nonzero when checks fail', async () => {
    process.env.PLATYPUS_TEST_DOCTOR_FAIL = '1'
    process.env.PLATYPUS_TEST_KEYCHAIN_FAIL = '1'
    const cmd = new Doctor([], {} as any)
    ;(cmd as any).log = vi.fn()
    ;(cmd as any).exit = vi.fn()
    await cmd.run()
    expect((cmd as any).exit).toHaveBeenCalledWith(1)
    delete process.env.PLATYPUS_TEST_DOCTOR_FAIL
    delete process.env.PLATYPUS_TEST_KEYCHAIN_FAIL
  })
})
