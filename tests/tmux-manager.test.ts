import { describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'

const tmuxMockState: {
  failListSessions: boolean
  pidText: string
  failDisplay: boolean
  failAttach: boolean
  emptyListPanes: boolean
  samePaneCountAfterSplit: boolean
  invalidPaneId: boolean
} = {
  failListSessions: false,
  pidText: '123\n',
  failDisplay: false,
  failAttach: false,
  emptyListPanes: false,
  samePaneCountAfterSplit: false,
  invalidPaneId: false
}

vi.mock('node:child_process', () => {
  let paneCount = 1
  function makeProc(stdoutText: string, stderrText: string, code: number) {
    const stdout = new EventEmitter()
    const stderr = new EventEmitter()
    const proc: any = new EventEmitter()
    proc.stdout = stdout
    proc.stderr = stderr
    proc.on = proc.addListener.bind(proc)
    setTimeout(() => {
      if (stdoutText) stdout.emit('data', Buffer.from(stdoutText))
      if (stderrText) stderr.emit('data', Buffer.from(stderrText))
      proc.emit('close', code)
    }, 0)
    return proc
  }

  return {
    spawn: (cmd: string, args: string[]) => {
      if (cmd !== 'tmux') return makeProc('', 'bad cmd', 1)
      const head = args[0]
      if (head === 'new-session') return makeProc('', '', 0)
      if (head === 'set-environment') return makeProc('', '', 0)
      if (head === 'display-message') {
        if (tmuxMockState.failDisplay) return makeProc('', 'fail', 1)
        return makeProc(tmuxMockState.pidText, '', 0)
      }
      if (head === 'list-panes') {
        if (tmuxMockState.emptyListPanes) return makeProc('', '', 0)
        const lines = []
        for (let i = 0; i < paneCount; i++) {
          const paneId = tmuxMockState.invalidPaneId ? '' : `%${i + 1}`
          lines.push(`${paneId}|@0|${i}|${i === 0 ? 1 : 0}`)
        }
        return makeProc(lines.join('\n') + '\n', '', 0)
      }
      if (head === 'select-layout') return makeProc('', '', 0)
      if (head === 'list-sessions') {
        if (tmuxMockState.failListSessions) return makeProc('', 'fail', 1)
        return makeProc('sess|1700000000|1\n', '', 0)
      }
      if (head === 'attach-session') {
        if (tmuxMockState.failAttach) return makeProc('', 'fail', 1)
        return makeProc('', '', 0)
      }
      if (head === 'split-window') {
        if (!tmuxMockState.samePaneCountAfterSplit) paneCount += 1
        return makeProc('', '', 0)
      }
      if (head === 'send-keys') return makeProc('', '', 0)
      if (head === 'capture-pane') return makeProc('out\n', '', 0)
      if (head === 'kill-session') return makeProc('', '', 0)
      return makeProc('', '', 0)
    }
  }
})

import { TmuxManager } from '../src/screen/tmux-manager.js'

describe('TmuxManager', () => {
  it('creates session and lists sessions', async () => {
    const tmux = new TmuxManager()
    const created = await tmux.createSession({
      name: 'sess',
      layout: 'dev' as any,
      panes: [],
      environment: {}
    })
    expect(created.session.name).toBe('sess')
    const list = await tmux.listSessions()
    expect(list[0].name).toBe('sess')

    await tmux.sendCommandToSession('sess', 'echo hi')
    const out = await tmux.captureOutput(tmux.getDefaultPaneId(created.session.id), 10)
    expect(out).toContain('out')

    await tmux.splitPane(created.session.id, 'vertical')
    await tmux.setLayout('sess', 'monitor' as any)
    await tmux.setLayout('sess', 'review' as any)
    await tmux.setLayout('sess', 'collaborative' as any)
    await tmux.detachSession(created.session.id)
    await tmux.attachSession(created.session.id).catch(() => undefined)
    await tmux.killSession(created.session.id)
    await tmux.killSessionName('sess')
    await tmux.cleanup()
  })

  it('throws when requesting default pane for unknown session', () => {
    const tmux = new TmuxManager()
    expect(() => tmux.getDefaultPaneId('missing')).toThrow()
  })

  it('throws when detach is requested for unknown session', async () => {
    const tmux = new TmuxManager()
    await expect(tmux.detachSession('missing')).rejects.toThrow(/Session not found/)
  })

  it('throws when tmux command fails', async () => {
    const tmux = new TmuxManager()
    tmuxMockState.failListSessions = true
    await expect(tmux.listSessions()).rejects.toThrow()
    tmuxMockState.failListSessions = false
  })

  it('handles missing pane and custom layout', async () => {
    const tmux = new TmuxManager()
    const created = await tmux.createSession({ name: 's2', layout: 'custom' as any, panes: [], environment: { PLATYPUS_PROJECT_ROOT: '/tmp' } })
    expect(created.session.name).toBe('s2')
    await expect(tmux.sendCommand('missing', 'x')).rejects.toThrow(/Pane not found/)
    await expect(tmux.captureOutput('missing', 10)).rejects.toThrow(/Pane not found/)
  })

  it('sends initial pane command and allows sending to pane', async () => {
    const tmux = new TmuxManager()
    const created = await tmux.createSession({
      name: 'withcmd',
      layout: 'dev' as any,
      panes: [{ id: 'p1', title: 'Main', command: 'echo hi', focus: true }],
      environment: {}
    })
    const paneId = tmux.getDefaultPaneId(created.session.id)
    await tmux.sendCommand(paneId, 'ls')
  })

  it('falls back to process pid when pid is invalid', async () => {
    tmuxMockState.pidText = 'abc\n'
    const tmux = new TmuxManager()
    const created = await tmux.createSession({ name: 's3', layout: 'dev' as any, panes: [], environment: {} })
    expect(created.session.pid).toBe(process.pid)
    tmuxMockState.pidText = '123\n'
  })

  it('falls back to process pid when display-message fails', async () => {
    tmuxMockState.failDisplay = true
    const tmux = new TmuxManager()
    const created = await tmux.createSession({ name: 's4', layout: 'dev' as any, panes: [], environment: {} })
    expect(created.session.pid).toBe(process.pid)
    tmuxMockState.failDisplay = false
  })

  it('rejects when attach-session fails', async () => {
    tmuxMockState.failAttach = true
    const tmux = new TmuxManager()
    await expect(tmux.attachSessionName('sess')).rejects.toThrow(/tmux exited/)
    tmuxMockState.failAttach = false
  })

  it('throws when createSession returns no panes', async () => {
    tmuxMockState.emptyListPanes = true
    const tmux = new TmuxManager()
    await expect(tmux.createSession({ name: 'nopanes', layout: 'dev' as any, panes: [], environment: {} }))
      .rejects.toThrow(/tmux session created with no panes/)
    tmuxMockState.emptyListPanes = false
  })

  it('throws when pane id is missing', async () => {
    tmuxMockState.invalidPaneId = true
    const tmux = new TmuxManager()
    await expect(tmux.createSession({ name: 'badpane', layout: 'dev' as any, panes: [], environment: {} }))
      .rejects.toThrow(/Missing tmux pane id/)
    tmuxMockState.invalidPaneId = false
  })

  it('throws when splitPane cannot detect created pane', async () => {
    tmuxMockState.samePaneCountAfterSplit = true
    const tmux = new TmuxManager()
    const created = await tmux.createSession({ name: 'splitfail', layout: 'dev' as any, panes: [], environment: {} })
    await expect(tmux.splitPane(created.session.id, 'horizontal')).rejects.toThrow(/Unable to detect created pane/)
    tmuxMockState.samePaneCountAfterSplit = false
  })

  it('handles splitSessionName for horizontal direction', async () => {
    const tmux = new TmuxManager()
    const created = await tmux.createSession({ name: 'splitname', layout: 'dev' as any, panes: [], environment: {} })
    await tmux.splitSessionName('splitname', 'horizontal')
    await tmux.killSession(created.session.id)
  })

  it('handles splitSessionName for vertical direction', async () => {
    const tmux = new TmuxManager()
    const created = await tmux.createSession({ name: 'splitvert', layout: 'dev' as any, panes: [], environment: {} })
    await tmux.splitSessionName('splitvert', 'vertical')
    await tmux.killSession(created.session.id)
  })
})
