import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { loadProfile } from '../src/core/profiles.js'

describe('profiles', () => {
  const prevHome = process.env.PLATYPUS_HOME
  const prevConfig = process.env.XDG_CONFIG_HOME
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-profiles-'))
    process.env.PLATYPUS_HOME = tmpDir
    process.env.XDG_CONFIG_HOME = path.join(tmpDir, 'xdg-config')
  })

  afterEach(() => {
    if (prevHome === undefined) delete process.env.PLATYPUS_HOME
    else process.env.PLATYPUS_HOME = prevHome
    if (prevConfig === undefined) delete process.env.XDG_CONFIG_HOME
    else process.env.XDG_CONFIG_HOME = prevConfig
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('loads builtin plan and build', () => {
    expect(loadProfile('plan').mode).toBe('plan')
    expect(loadProfile('build').mode).toBe('build')
  })

  it('loads yaml profile from config dir', () => {
    const dir = path.join(process.env.XDG_CONFIG_HOME!, 'platypus', 'profiles')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(
      path.join(dir, 'x.yaml'),
      ['name: x', 'mode: plan', 'provider: openai', 'allowedTools: [read_file, list_files]'].join('\n'),
      'utf8'
    )
    const p = loadProfile('x')
    expect(p.name).toBe('x')
    expect(p.mode).toBe('plan')
    expect(p.allowedTools).toContain('read_file')
  })

  it('throws on invalid profile mode', () => {
    const dir = path.join(process.env.XDG_CONFIG_HOME!, 'platypus', 'profiles')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'bad.yaml'), ['name: bad', 'mode: nope'].join('\n'), 'utf8')
    expect(() => loadProfile('bad')).toThrow(/Invalid profile mode/)
  })
})
