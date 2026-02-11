import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { getPlatypusHome, getPlatypusConfigDir, getPlatypusStateDir } from '../src/core/paths.js'

describe('paths', () => {
  const prevHome = process.env.PLATYPUS_HOME
  const prevXdgState = process.env.XDG_STATE_HOME
  const prevXdgConfig = process.env.XDG_CONFIG_HOME
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-paths-'))
  })

  afterEach(() => {
    if (prevHome === undefined) delete process.env.PLATYPUS_HOME
    else process.env.PLATYPUS_HOME = prevHome
    if (prevXdgState === undefined) delete process.env.XDG_STATE_HOME
    else process.env.XDG_STATE_HOME = prevXdgState
    if (prevXdgConfig === undefined) delete process.env.XDG_CONFIG_HOME
    else process.env.XDG_CONFIG_HOME = prevXdgConfig
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('uses XDG state/config when PLATYPUS_HOME is unset', () => {
    delete process.env.PLATYPUS_HOME
    process.env.XDG_STATE_HOME = path.join(tmpDir, 'state')
    process.env.XDG_CONFIG_HOME = path.join(tmpDir, 'config')
    const home = getPlatypusHome()
    expect(home).toBe(path.join(process.env.XDG_STATE_HOME, 'platypus'))
    expect(getPlatypusStateDir()).toBe(path.join(home, 'state'))
    expect(getPlatypusConfigDir()).toBe(path.join(process.env.XDG_CONFIG_HOME, 'platypus'))
  })
})
