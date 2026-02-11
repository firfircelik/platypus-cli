import { BaseCommand } from '../base-command.js'
import { spawnSync } from 'node:child_process'
import { KeyStore } from '../../crypto/key-store.js'
import { getPlatypusHome } from '../../core/paths.js'

export default class Doctor extends BaseCommand {
  static description = 'Check local environment and dependencies'

  async run(): Promise<void> {
    const checks: Array<{ name: string; ok: boolean; detail: string }> = []
    checks.push(checkCommand('node', ['--version']))
    checks.push(checkCommand('npm', ['--version']))
    checks.push(checkCommand('git', ['--version']))
    checks.push(checkCommand('rg', ['--version']))
    checks.push(checkCommand('tmux', ['-V']))

    const home = getPlatypusHome()
    checks.push({ name: 'PLATYPUS_HOME', ok: true, detail: home })

    const ks = new KeyStore()
    try {
      await ks.initialize()
      ks.close()
      checks.push({ name: 'key storage', ok: true, detail: 'ok' })
    } catch (e) {
      checks.push({ name: 'key storage', ok: false, detail: e instanceof Error ? e.message : 'unknown error' })
    }

    for (const c of checks) {
      this.log(`${c.ok ? 'OK' : 'FAIL'}\t${c.name}\t${c.detail}`)
    }
    const failed = checks.some(c => !c.ok)
    if (failed) this.exit(1)
  }
}

function checkCommand(cmd: string, args: string[]): { name: string; ok: boolean; detail: string } {
  try {
    const res = spawnSync(cmd, args, { encoding: 'utf8' })
    const out = `${res.stdout ?? ''}${res.stderr ?? ''}`.trim()
    if (res.status !== 0) return { name: cmd, ok: false, detail: out.length > 0 ? out : `exit ${res.status}` }
    return { name: cmd, ok: true, detail: out.split('\n')[0] ?? 'ok' }
  } catch (e) {
    return { name: cmd, ok: false, detail: e instanceof Error ? e.message : 'unknown error' }
  }
}
