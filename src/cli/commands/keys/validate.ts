import { Flags } from '@oclif/core'
import { BaseCommand } from '../../base-command.js'
import { validateProviderKey } from '../../../crypto/providers.js'

export default class KeysValidate extends BaseCommand {
  static description = 'Validate a stored key against provider API when supported'

  static flags = {
    provider: Flags.string({ char: 'p', required: true, description: 'Provider id (e.g. openai)' })
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(KeysValidate)
    const provider = flags.provider.trim().toLowerCase()
    const store = await this.getKeyStore()
    const key = await store.getKey(provider)
    const result = await validateProviderKey(provider, key)
    await store.validateKey(provider, async () => result.valid)

    if (!result.valid) {
      this.error(`Invalid key for ${provider}: ${result.error ?? 'Unknown error'}`)
    }
    this.log(`Key is valid for provider: ${provider}`)
  }
}

