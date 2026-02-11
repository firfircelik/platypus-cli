import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

export function getPlatypusHome(): string {
  const envHome = process.env.PLATYPUS_HOME
  const xdgState =
    process.env.XDG_STATE_HOME && process.env.XDG_STATE_HOME.trim().length > 0 ? path.resolve(process.env.XDG_STATE_HOME) : null

  const dir =
    envHome && envHome.trim().length > 0
      ? path.resolve(envHome)
      : xdgState
        ? path.join(xdgState, 'platypus')
        : path.join(os.homedir(), '.platypus')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

export function getPlatypusStateDir(): string {
  const dir = path.join(getPlatypusHome(), 'state')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function getPlatypusConfigDir(): string {
  const xdgConfig =
    process.env.XDG_CONFIG_HOME && process.env.XDG_CONFIG_HOME.trim().length > 0 ? path.resolve(process.env.XDG_CONFIG_HOME) : null
  const dir = xdgConfig ? path.join(xdgConfig, 'platypus') : path.join(getPlatypusHome(), 'config')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function getStateDbPath(): string {
  return path.join(getPlatypusStateDir(), 'state.db')
}

export function getAuditLogPath(): string {
  return path.join(getPlatypusStateDir(), 'audit.log')
}
