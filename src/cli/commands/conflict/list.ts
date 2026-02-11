import { BaseCommand } from '../../base-command.js'
import { ConflictManager } from '../../../state/conflict-manager.js'

export default class ConflictList extends BaseCommand {
  static description = 'List detected file conflicts'

  async run(): Promise<void> {
    const cm = new ConflictManager()
    const conflicts = cm.listConflicts()
    if (conflicts.length === 0) {
      this.log('No conflicts.')
      return
    }
    for (const c of conflicts) {
      this.log(`${c.id}\t${c.filePath}\tagents=${c.agents.join(',')}\tresolved=${c.resolved}`)
    }
  }
}

