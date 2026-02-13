import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const events: Record<string, Function[]> = {}
const replState: { terminal: boolean; lines: string[] } = { terminal: true, lines: ['hi'] }
let lastRl: any = null

vi.mock('node:readline', () => ({
  default: {
    createInterface: () => {
      const rl: any = {
        get terminal() {
          return replState.terminal
        },
        setPrompt: vi.fn(),
        prompt: vi.fn(),
        close: vi.fn(() => {
          ;(events.close ?? []).forEach(fn => fn())
        }),
        on: (name: string, fn: Function) => {
          events[name] = events[name] ?? []
          events[name].push(fn)
          return rl
        },
        [Symbol.asyncIterator]: async function* () {
          for (const l of replState.lines) yield l
        }
      }
      lastRl = rl
      return rl
    }
  }
}))

import { createRepl } from '../src/engine/repl.js'

describe('repl', () => {
  const prevHome = process.env.PLATYPUS_HOME
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-repl-'))
    process.env.PLATYPUS_HOME = tmpDir
  })

  afterEach(() => {
    if (prevHome === undefined) delete process.env.PLATYPUS_HOME
    else process.env.PLATYPUS_HOME = prevHome
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('runs handler for lines and prints', async () => {
    const seen: string[] = []
    replState.terminal = true
    replState.lines = ['', 'hi']
    fs.writeFileSync(path.join(process.env.PLATYPUS_HOME!, 'history'), 'a\nb\n', 'utf8')
    const repl = createRepl('p> ', {
      onLine: async line => {
        seen.push(line)
      },
      onExit: async () => undefined
    })
    repl.print('x')
    await repl.start()
    expect(seen).toContain('hi')
    expect(seen).not.toContain('')
    expect(Array.isArray(lastRl.history)).toBe(true)
    expect(lastRl.history.join('\n')).toContain('b')
  })

  it('handles SIGINT and non-terminal output', async () => {
    replState.terminal = false
    replState.lines = []
    let exited = 0
    const repl = createRepl('p> ', {
      onLine: async () => undefined,
      onExit: async () => {
        exited += 1
      }
    })
    repl.print('y')
    ;(events.SIGINT ?? []).forEach(fn => fn())
    expect(exited).toBeGreaterThan(0)
  })

  it('handles history read and write failures', async () => {
    replState.terminal = true
    replState.lines = []
    const existsMock = vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    const readMock = vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('read fail')
    })
    const mkdirMock = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {
      throw new Error('mkdir fail')
    })
    const repl = createRepl('p> ', {
      onLine: async () => undefined,
      onExit: async () => undefined
    })
    lastRl.close()
    existsMock.mockRestore()
    readMock.mockRestore()
    mkdirMock.mockRestore()
    repl.close()
  })
})
