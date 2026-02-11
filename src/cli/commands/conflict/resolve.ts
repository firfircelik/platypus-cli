import { Flags } from '@oclif/core'
import { BaseCommand } from '../../base-command.js'
import { ConflictManager } from '../../../state/conflict-manager.js'

export default class ConflictResolve extends BaseCommand {
  static description = 'Mark a conflict as resolved'

  static flags = {
    id: Flags.string({ char: 'i', required: true, description: 'Conflict id' }),
    by: Flags.string({ char: 'b', required: true, description: 'Resolver agent id' }),
    type: Flags.string({ char: 't', required: true, description: 'Resolution type (merge|override|rename|manual)' })
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(ConflictResolve)
    const cm = new ConflictManager()
    cm.resolve(flags.id, {
      type: flags.type as any,
      resolvedBy: flags.by,
      resolvedAt: new Date(),
      result: {
        path: '',
        hash: '',
        modifiedBy: null,
        lockedBy: null,
        lockedAt: null,
        version: 0
      }
    })
    this.log(`Resolved conflict ${flags.id}`)
  }
}

