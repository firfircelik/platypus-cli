import { Flags } from '@oclif/core'
import { BaseCommand } from '../../base-command.js'

export default class ScreenSplit extends BaseCommand {
  static description = 'Split a tmux session into panes'

  static flags = {
    session: Flags.string({ char: 's', required: true, description: 'tmux session name' }),
    direction: Flags.string({ char: 'd', default: 'vertical', description: 'vertical|horizontal' })
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(ScreenSplit)
    const dir = flags.direction === 'horizontal' ? 'horizontal' : 'vertical'
    await this.getTmuxManager().splitSessionName(flags.session, dir as any)
    this.log(`Split session ${flags.session} (${dir})`)
  }
}

