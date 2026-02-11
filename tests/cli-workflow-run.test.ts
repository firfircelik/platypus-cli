import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

let getCalls = 0

vi.mock('../src/state/agent-task-store.js', () => ({
  AgentTaskStore: class {
    enqueue() {
      return { id: 't1', agentId: 'a1', description: 'x', status: 'pending', createdAt: new Date(), updatedAt: new Date() }
    }
    get() {
      const status = getCalls++ < 1 ? 'pending' : 'done'
      return { id: 't1', agentId: 'a1', description: 'x', status, createdAt: new Date(), updatedAt: new Date() }
    }
    getResult() {
      return { taskId: 't1', agentId: 'a1', status: 'done', output: 'ok', updatedAt: new Date() }
    }
  }
}))

import WorkflowRun from '../src/cli/commands/workflow/run.js'
import { resetStateDb } from '../src/state/state-db.js'

describe('workflow run yaml', () => {
  const prevHome = process.env.PLATYPUS_HOME
  const prevConfig = process.env.XDG_CONFIG_HOME
  const prevPlatypusProvider = process.env.PLATYPUS_PROVIDER
  const prevPlatypusMode = process.env.PLATYPUS_MODE
  let tmpDir: string
  let yamlPath: string

  beforeEach(() => {
    getCalls = 0
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-wf-run-'))
    process.env.PLATYPUS_HOME = tmpDir
    process.env.XDG_CONFIG_HOME = path.join(tmpDir, 'xdg-config')
    const dir = path.join(process.env.XDG_CONFIG_HOME, 'platypus', 'profiles')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'x.yaml'), ['name: x', 'mode: plan', 'provider: openai'].join('\n'), 'utf8')
    process.env.PLATYPUS_PROVIDER = 'anthropic'
    process.env.PLATYPUS_MODE = 'build'
    resetStateDb()
    yamlPath = path.join(tmpDir, 'wf.yaml')
    fs.writeFileSync(
      yamlPath,
      [
        'project:',
        '  name: x',
        '  root: .',
        'team:',
        '  agents:',
        '    - name: a',
        '      role: frontend-dev',
        '      capabilities: [ui]',
        'workflow:',
        '  - task: \"do\"',
        '    routing: auto'
      ].join('\n'),
      'utf8'
    )
  })

  afterEach(() => {
    resetStateDb()
    if (prevHome === undefined) delete process.env.PLATYPUS_HOME
    else process.env.PLATYPUS_HOME = prevHome
    if (prevConfig === undefined) delete process.env.XDG_CONFIG_HOME
    else process.env.XDG_CONFIG_HOME = prevConfig
    if (prevPlatypusProvider === undefined) delete process.env.PLATYPUS_PROVIDER
    else process.env.PLATYPUS_PROVIDER = prevPlatypusProvider
    if (prevPlatypusMode === undefined) delete process.env.PLATYPUS_MODE
    else process.env.PLATYPUS_MODE = prevPlatypusMode
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('parses yaml and enqueues tasks', async () => {
    vi.useFakeTimers()
    const cmd = new WorkflowRun([yamlPath], {} as any)
    ;(cmd as any).parse = vi.fn(async () => ({ args: { file: yamlPath }, flags: { wait: 1, follow: true, profile: undefined } }))
    ;(cmd as any).getAgentFactory = vi.fn(() => ({
      initialize: vi.fn(async () => undefined),
      createAgent: vi.fn(async () => ({ id: 'a1', name: 'a', sessionName: 's1' }))
    }))
    ;(cmd as any).getAgentStore = vi.fn(() => ({ list: () => [] }))
    ;(cmd as any).getOrchestrator = vi.fn(() => ({
      assignTask: vi.fn(async (t: any) => [{ agentId: 'a1', task: { ...t, description: t.description } }])
    }))
    ;(cmd as any).getTmuxManager = vi.fn(() => ({ sendCommandToSession: vi.fn(async () => undefined) }))
    ;(cmd as any).log = vi.fn()

    const p = cmd.run()
    await vi.advanceTimersByTimeAsync(1500)
    await p
    vi.useRealTimers()

    const text = (cmd as any).log.mock.calls.map((c: any[]) => c.join(' ')).join('\n')
    expect(text).toContain('Workflow run id:')
  })

  it('supports profile flag', async () => {
    vi.useFakeTimers()
    const cmd = new WorkflowRun([yamlPath], {} as any)
    ;(cmd as any).parse = vi.fn(async () => ({ args: { file: yamlPath }, flags: { wait: 0, follow: false, profile: 'x' } }))
    ;(cmd as any).getAgentFactory = vi.fn(() => ({
      initialize: vi.fn(async () => undefined),
      createAgent: vi.fn(async () => ({ id: 'a1', name: 'a', sessionName: 's1' }))
    }))
    ;(cmd as any).getAgentStore = vi.fn(() => ({ list: () => [] }))
    ;(cmd as any).getOrchestrator = vi.fn(() => ({
      assignTask: vi.fn(async (t: any) => [{ agentId: 'a1', task: { ...t, description: t.description } }])
    }))
    ;(cmd as any).getTmuxManager = vi.fn(() => ({ sendCommandToSession: vi.fn(async () => undefined) }))
    ;(cmd as any).log = vi.fn()

    const p = cmd.run()
    await vi.advanceTimersByTimeAsync(10)
    await p
    vi.useRealTimers()
    expect((cmd as any).log.mock.calls.map((c: any[]) => c.join(' ')).join('\n')).toContain('Workflow run id:')
    expect(process.env.PLATYPUS_PROVIDER).toBe('anthropic')
    expect(process.env.PLATYPUS_MODE).toBe('build')
  })
})
