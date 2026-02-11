import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import SpawnTeam from '../src/cli/commands/agent/spawn-team.js'

describe('agent spawn-team profile', () => {
  const prevHome = process.env.PLATYPUS_HOME
  const prevConfig = process.env.XDG_CONFIG_HOME
  const prevPlatypusProvider = process.env.PLATYPUS_PROVIDER
  const prevPlatypusModel = process.env.PLATYPUS_MODEL
  const prevPlatypusMode = process.env.PLATYPUS_MODE
  const prevPlatypusAutoApprove = process.env.PLATYPUS_AUTO_APPROVE
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-spawn-'))
    process.env.PLATYPUS_HOME = tmpDir
    process.env.XDG_CONFIG_HOME = path.join(tmpDir, 'xdg-config')
    const dir = path.join(process.env.XDG_CONFIG_HOME, 'platypus', 'profiles')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(
      path.join(dir, 'x.yaml'),
      ['name: x', 'mode: plan', 'provider: anthropic', 'model: m1', 'autoApprove: false'].join('\n'),
      'utf8'
    )
    process.env.PLATYPUS_PROVIDER = 'google'
    process.env.PLATYPUS_MODEL = 'm0'
    process.env.PLATYPUS_MODE = 'build'
    process.env.PLATYPUS_AUTO_APPROVE = 'true'
  })

  afterEach(() => {
    if (prevHome === undefined) delete process.env.PLATYPUS_HOME
    else process.env.PLATYPUS_HOME = prevHome
    if (prevConfig === undefined) delete process.env.XDG_CONFIG_HOME
    else process.env.XDG_CONFIG_HOME = prevConfig
    if (prevPlatypusProvider === undefined) delete process.env.PLATYPUS_PROVIDER
    else process.env.PLATYPUS_PROVIDER = prevPlatypusProvider
    if (prevPlatypusModel === undefined) delete process.env.PLATYPUS_MODEL
    else process.env.PLATYPUS_MODEL = prevPlatypusModel
    if (prevPlatypusMode === undefined) delete process.env.PLATYPUS_MODE
    else process.env.PLATYPUS_MODE = prevPlatypusMode
    if (prevPlatypusAutoApprove === undefined) delete process.env.PLATYPUS_AUTO_APPROVE
    else process.env.PLATYPUS_AUTO_APPROVE = prevPlatypusAutoApprove
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('applies profile env for agent creation then restores', async () => {
    const cmd = new SpawnTeam([], {} as any)
    ;(cmd as any).parse = vi.fn(async () => ({ flags: { prefix: 't', layout: 'collaborative', mode: 'build', profile: 'x' } }))
    ;(cmd as any).getAgentFactory = vi.fn(() => ({
      createAgent: vi.fn(async ({ name, role }: any) => ({ id: name, name, role, sessionName: 's' }))
    }))
    ;(cmd as any).log = vi.fn()
    await cmd.run()
    expect(process.env.PLATYPUS_PROVIDER).toBe('google')
    expect(process.env.PLATYPUS_MODEL).toBe('m0')
    expect(process.env.PLATYPUS_MODE).toBe('build')
    expect(process.env.PLATYPUS_AUTO_APPROVE).toBe('true')
  })
})
