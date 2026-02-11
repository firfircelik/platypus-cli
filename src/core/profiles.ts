import fs from 'node:fs'
import path from 'node:path'
import YAML from 'yaml'
import { getPlatypusConfigDir } from './paths.js'

export type PlatypusMode = 'plan' | 'build'

export type PlatypusProfile = {
  name: string
  mode: PlatypusMode
  provider?: string
  model?: string
  autoApprove?: boolean
  allowedTools?: string[]
}

export function getBuiltinProfile(name: string): PlatypusProfile | null {
  const n = name.trim().toLowerCase()
  if (n === 'plan') {
    return {
      name: 'plan',
      mode: 'plan',
      autoApprove: false,
      allowedTools: ['read_file', 'read_json', 'list_files', 'search_files', 'show_writes', 'run_command']
    }
  }
  if (n === 'build') {
    return { name: 'build', mode: 'build' }
  }
  return null
}

export function loadProfile(name: string): PlatypusProfile {
  const builtin = getBuiltinProfile(name)
  if (builtin) return builtin

  const dir = path.join(getPlatypusConfigDir(), 'profiles')
  const p1 = path.join(dir, `${name}.yaml`)
  const p2 = path.join(dir, `${name}.yml`)
  const p3 = path.join(dir, `${name}.json`)

  const file = [p1, p2, p3].find(p => fs.existsSync(p))
  if (!file) throw new Error(`Profile not found: ${name}`)

  const raw = fs.readFileSync(file, 'utf8')
  const parsed = file.endsWith('.json') ? (JSON.parse(raw) as any) : (YAML.parse(raw) as any)
  const mode = String(parsed?.mode ?? '').trim().toLowerCase()
  if (mode !== 'plan' && mode !== 'build') throw new Error(`Invalid profile mode: ${mode}`)
  const profile: PlatypusProfile = {
    name: String(parsed?.name ?? name),
    mode,
    provider: parsed?.provider ? String(parsed.provider) : undefined,
    model: parsed?.model ? String(parsed.model) : undefined,
    autoApprove: parsed?.autoApprove === undefined ? undefined : Boolean(parsed.autoApprove),
    allowedTools: Array.isArray(parsed?.allowedTools) ? parsed.allowedTools.map((x: any) => String(x)) : undefined
  }
  return profile
}
