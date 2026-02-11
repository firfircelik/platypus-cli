import { BaseCommand } from '../base-command.js'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import { getPlatypusHome } from '../../core/paths.js'

export default class Upgrade extends BaseCommand {
  static description = 'Self-update the installed Platypus package under PLATYPUS_HOME'

  async run(): Promise<void> {
    const home = getPlatypusHome()
    const pkg =
      process.env.PLATYPUS_PKG && process.env.PLATYPUS_PKG.trim().length > 0
        ? process.env.PLATYPUS_PKG.trim()
        : 'platypus-cli'
    const version =
      process.env.PLATYPUS_VERSION && process.env.PLATYPUS_VERSION.trim().length > 0
        ? process.env.PLATYPUS_VERSION.trim()
        : 'latest'
    const spec = needsVersionSuffix(pkg) ? `${pkg}@${version}` : pkg

    const res = spawnSync('npm', ['install', '--silent', '--no-progress', '--prefix', home, spec], { encoding: 'utf8' })
    const out = `${res.stdout ?? ''}${res.stderr ?? ''}`.trim()
    if (res.status !== 0) {
      this.error(out.length > 0 ? out : `npm exited ${res.status}`)
    }

    const preferred = path.join(home, 'node_modules', '.bin', 'platypus')
    if (!fs.existsSync(preferred)) this.error(`Expected binary not found: ${preferred}`)
    this.log(`Upgraded: ${spec}`)
    this.log(`Binary: ${preferred}`)
  }
}

function needsVersionSuffix(pkg: string): boolean {
  if (pkg.includes(':')) return false
  if (pkg.includes('/')) return false
  if (pkg.endsWith('.tgz') || pkg.endsWith('.tar.gz')) return false
  return true
}
