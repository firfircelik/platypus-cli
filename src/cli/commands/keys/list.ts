import { BaseCommand } from '../../base-command.js'

export default class KeysList extends BaseCommand {
  static description = 'List stored API keys (without revealing secret values)'

  async run(): Promise<void> {
    const store = await this.getKeyStore()
    const keys = await store.listKeys()
    if (keys.length === 0) {
      this.log('No keys stored.')
      return
    }
    for (const k of keys) {
      this.log(`${k.provider}\t${k.keyId}\tvalid=${k.valid}\tupdated=${k.updatedAt.toISOString()}`)
    }
  }
}

