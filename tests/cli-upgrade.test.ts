import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(() => ({ status: 0, stdout: '', stderr: '' }))
}))

import Upgrade from '../src/cli/commands/upgrade.js'

describe('upgrade', () => {
  const prevHome = process.env.PLATYPUS_HOME
  const prevPkg = process.env.PLATYPUS_PKG
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-upgrade-'))
    process.env.PLATYPUS_HOME = tmpDir
    const bin = path.join(tmpDir, 'node_modules', '.bin')
    fs.mkdirSync(bin, { recursive: true })
    fs.writeFileSync(path.join(bin, 'platypus'), '#!/bin/sh\n', 'utf8')
  })

  afterEach(() => {
    if (prevHome === undefined) delete process.env.PLATYPUS_HOME
    else process.env.PLATYPUS_HOME = prevHome
    if (prevPkg === undefined) delete process.env.PLATYPUS_PKG
    else process.env.PLATYPUS_PKG = prevPkg
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('runs npm install and prints binary path', async () => {
    const cmd = new Upgrade([], {} as any)
    ;(cmd as any).log = vi.fn()
    await cmd.run()
    const text = (cmd as any).log.mock.calls.map((c: any[]) => c.join(' ')).join('\n')
    expect(text).toContain('Binary:')
  })

  it('supports file: package spec without version suffix', async () => {
    process.env.PLATYPUS_PKG = `file:${tmpDir}`
    const cmd = new Upgrade([], {} as any)
    ;(cmd as any).log = vi.fn()
    await cmd.run()
    const text = (cmd as any).log.mock.calls.map((c: any[]) => c.join(' ')).join('\n')
    expect(text).toContain('Upgraded: file:')
  })

  it('throws when npm fails', async () => {
    const child = await import('node:child_process')
    ;(child.spawnSync as any).mockReturnValueOnce({ status: 1, stdout: '', stderr: 'fail' })
    const cmd = new Upgrade([], {} as any)
    await expect(cmd.run()).rejects.toThrow()
  })
})
