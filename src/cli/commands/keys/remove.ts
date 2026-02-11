import { Flags } from '@oclif/core'
import { BaseCommand } from '../../base-command.js'

export default class KeysRemove extends BaseCommand {
  static description = 'Remove a stored API key for a provider'

  static flags = {
    provider: Flags.string({ char: 'p', required: true, description: 'Provider id (e.g. openai)' })
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(KeysRemove)
    const provider = flags.provider.trim().toLowerCase()
    const store = await this.getKeyStore()
    await store.deleteKey(provider)
    this.log(`Removed key for provider: ${provider}`)
  }
}

