import { Flags } from '@oclif/core'
import { BaseCommand } from '../../base-command.js'

export default class ScreenLayout extends BaseCommand {
  static description = 'Change layout for a tmux session'

  static flags = {
    session: Flags.string({ char: 's', required: true, description: 'tmux session name' }),
    layout: Flags.string({ char: 'l', required: true, description: 'Layout name (dev, review, monitor, collaborative)' })
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(ScreenLayout)
    await this.getTmuxManager().setLayout(flags.session, flags.layout as any)
    this.log(`Updated layout for session ${flags.session} to ${flags.layout}`)
  }
}

