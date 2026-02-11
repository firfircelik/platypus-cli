import { Flags } from '@oclif/core'
import { BaseCommand } from '../../base-command.js'

export default class ScreenAttach extends BaseCommand {
  static description = 'Attach to a tmux session by name or agent id'

  static flags = {
    session: Flags.string({ char: 's', required: false, description: 'tmux session name' }),
    agent: Flags.string({ char: 'a', required: false, description: 'agent id' })
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(ScreenAttach)
    const tmux = this.getTmuxManager()

    if (flags.session) {
      await tmux.attachSessionName(flags.session)
      return
    }

    if (flags.agent) {
      const agent = this.getAgentStore().get(flags.agent)
      if (!agent) this.error(`Agent not found: ${flags.agent}`)
      await tmux.attachSessionName(agent.sessionName)
      return
    }

    this.error('Provide --session or --agent')
  }
}

