import { spawn } from 'node:child_process'
import { v4 as uuidv4 } from 'uuid'
import type { SessionConfig, SessionHandle, PaneHandle, ScreenLayout } from '../types/agent.types.js'

type TmuxTarget = string

export class TmuxManager {
  private sessions: Map<string, SessionHandle>
  private panes: Map<string, { pane: PaneHandle; target: TmuxTarget }>

  constructor() {
    this.sessions = new Map()
    this.panes = new Map()
  }

  async createSession(config: SessionConfig): Promise<{ session: SessionHandle; panes: PaneHandle[] }> {
    const sessionId = uuidv4()
    const sessionName = config.name || `platypus-${sessionId.slice(0, 8)}`

    const cwd = config.environment?.PLATYPUS_PROJECT_ROOT
    const createArgs = ['new-session', '-d', '-s', sessionName, '-n', 'platypus']
    if (cwd) createArgs.push('-c', cwd)
    await this.exec(createArgs)

    for (const [k, v] of Object.entries(config.environment ?? {})) {
      await this.exec(['set-environment', '-t', sessionName, k, v])
    }

    const session: SessionHandle = {
      id: sessionId,
      name: sessionName,
      pid: await this.getSessionPid(sessionName),
      socketPath: '',
      createdAt: new Date(),
      active: true
    }

    this.sessions.set(sessionId, session)

    const panesBefore = await this.listPanesBySessionName(sessionName)
    await this.applyLayout(sessionName, config.layout)
    const panesAfterLayout = await this.listPanesBySessionName(sessionName)

    for (const pane of panesAfterLayout) {
      this.trackPane(sessionId, pane)
    }

    for (const paneConfig of config.panes) {
      if (paneConfig.command) {
        const defaultPane = panesAfterLayout.find(p => p.active) || panesAfterLayout[0]
        if (defaultPane) {
          const paneId = this.findPaneId(sessionId, defaultPane.windowId, defaultPane.index)
          if (paneId) {
            await this.sendCommand(paneId, paneConfig.command)
          }
        }
      }
    }

    if (panesBefore.length === 0 && panesAfterLayout.length === 0) {
      throw new Error('tmux session created with no panes')
    }

    return { session, panes: panesAfterLayout }
  }

  async attachSession(sessionId: string): Promise<void> {
    const session = this.requireSession(sessionId)
    await this.spawnInteractive(['attach-session', '-t', session.name])
  }

  async attachSessionName(sessionName: string): Promise<void> {
    await this.spawnInteractive(['attach-session', '-t', sessionName])
  }

  async detachSession(sessionId: string): Promise<void> {
    const session = this.requireSession(sessionId)
    await this.exec(['detach-client', '-t', session.name])
  }

  async listSessions(): Promise<SessionHandle[]> {
    const output = await this.exec(['list-sessions', '-F', '#{session_name}|#{session_created}|#{session_attached}'])
    const lines = output.split('\n').filter(Boolean)

    return lines.map(line => {
      const [name, created, attached] = line.split('|')
      return {
        id: name,
        name,
        pid: process.pid,
        socketPath: '',
        createdAt: new Date(parseInt(created, 10) * 1000),
        active: attached === '1'
      }
    })
  }

  async killSession(sessionId: string): Promise<void> {
    const session = this.requireSession(sessionId)
    await this.exec(['kill-session', '-t', session.name])
    this.sessions.delete(sessionId)
    for (const [paneId, tracked] of this.panes) {
      if (tracked.pane.sessionId === sessionId) {
        this.panes.delete(paneId)
      }
    }
  }

  async killSessionName(sessionName: string): Promise<void> {
    await this.exec(['kill-session', '-t', sessionName])
  }

  async splitPane(sessionId: string, direction: 'vertical' | 'horizontal'): Promise<PaneHandle> {
    const session = this.requireSession(sessionId)
    const before = await this.listPanesBySessionName(session.name)
    await this.exec(['split-window', direction === 'vertical' ? '-h' : '-v', '-t', session.name])
    const after = await this.listPanesBySessionName(session.name)

    const beforeKey = new Set(before.map(p => `${p.windowId}:${p.index}`))
    const created = after.find(p => !beforeKey.has(`${p.windowId}:${p.index}`))
    if (!created) {
      throw new Error('Unable to detect created pane')
    }

    this.trackPane(sessionId, created)
    return created
  }

  async splitSessionName(sessionName: string, direction: 'vertical' | 'horizontal'): Promise<void> {
    await this.exec(['split-window', direction === 'vertical' ? '-h' : '-v', '-t', sessionName])
  }

  async setLayout(sessionName: string, layout: ScreenLayout): Promise<void> {
    await this.applyLayout(sessionName, layout)
  }

  async sendCommand(paneId: string, command: string): Promise<void> {
    const tracked = this.panes.get(paneId)
    if (!tracked) {
      throw new Error(`Pane not found: ${paneId}`)
    }
    await this.exec(['send-keys', '-t', tracked.target, command, 'Enter'])
  }

  async sendCommandToSession(sessionName: string, command: string): Promise<void> {
    await this.exec(['send-keys', '-t', sessionName, command, 'Enter'])
  }

  async captureOutput(paneId: string, lines: number = 200): Promise<string> {
    const tracked = this.panes.get(paneId)
    if (!tracked) {
      throw new Error(`Pane not found: ${paneId}`)
    }
    return this.exec(['capture-pane', '-t', tracked.target, '-p', '-e', '-J', '-S', `-${lines}`])
  }

  getDefaultPaneId(sessionId: string): string {
    const panes = Array.from(this.panes.entries())
      .filter(([, p]) => p.pane.sessionId === sessionId)
      .map(([id, p]) => ({ id, pane: p.pane }))
    const active = panes.find(p => p.pane.active) || panes[0]
    if (!active) {
      throw new Error('No panes tracked for session')
    }
    return active.id
  }

  private requireSession(sessionId: string): SessionHandle {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }
    return session
  }

  private trackPane(sessionId: string, pane: PaneHandle & { tmuxPaneId?: string }): void {
    const paneId = this.findPaneId(sessionId, pane.windowId, pane.index) ?? uuidv4()
    const target = pane.tmuxPaneId
    if (!target) {
      throw new Error('Missing tmux pane id')
    }
    const storedPane: PaneHandle = {
      id: pane.id,
      sessionId,
      windowId: pane.windowId,
      index: pane.index,
      active: pane.active
    }
    this.panes.set(paneId, { pane: storedPane, target })
  }

  private findPaneId(sessionId: string, windowId: string, index: number): string | undefined {
    for (const [id, tracked] of this.panes) {
      if (tracked.pane.sessionId === sessionId && tracked.pane.windowId === windowId && tracked.pane.index === index) {
        return id
      }
    }
    return undefined
  }

  private async listPanesBySessionName(sessionName: string): Promise<(PaneHandle & { tmuxPaneId: string })[]> {
    const output = await this.exec([
      'list-panes',
      '-t',
      sessionName,
      '-F',
      '#{pane_id}|#{window_id}|#{pane_index}|#{pane_active}'
    ])
    const lines = output.split('\n').filter(Boolean)
    return lines.map(line => {
      const [paneId, windowId, paneIndex, active] = line.split('|')
      return {
        id: uuidv4(),
        sessionId: sessionName,
        windowId,
        index: parseInt(paneIndex, 10),
        active: active === '1',
        tmuxPaneId: paneId
      }
    })
  }

  private async applyLayout(sessionName: string, layout: ScreenLayout): Promise<void> {
    const layoutName = this.mapLayout(layout)
    if (layoutName) {
      await this.exec(['select-layout', '-t', sessionName, layoutName])
    }
  }

  private mapLayout(layout: ScreenLayout): string | null {
    switch (layout) {
      case 'dev':
        return 'main-horizontal'
      case 'review':
        return 'main-vertical'
      case 'monitor':
        return 'tiled'
      case 'collaborative':
        return 'tiled'
      default:
        return null
    }
  }

  private async getSessionPid(sessionName: string): Promise<number> {
    try {
      const output = await this.exec(['display-message', '-p', '-t', sessionName, '#{session_pid}'])
      const pid = parseInt(output.trim(), 10)
      return Number.isFinite(pid) ? pid : process.pid
    } catch {
      return process.pid
    }
  }

  private exec(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn('tmux', args)
      let stdout = ''
      let stderr = ''

      proc.stdout?.on('data', d => (stdout += d.toString()))
      proc.stderr?.on('data', d => (stderr += d.toString()))

      proc.on('close', code => {
        if (code === 0) {
          resolve(stdout.trimEnd())
          return
        }
        reject(new Error(stderr.trim() || `tmux command failed: ${args.join(' ')}`))
      })
    })
  }

  private spawnInteractive(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn('tmux', args, { stdio: 'inherit' })
      proc.on('close', code => {
        if (code === 0) resolve()
        else reject(new Error(`tmux exited with code ${code}`))
      })
    })
  }

  async cleanup(): Promise<void> {
    this.panes.clear()
    this.sessions.clear()
  }
}
