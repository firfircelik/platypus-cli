import { BaseCommand } from '../../base-command.js'

export default class ScreenList extends BaseCommand {
  static description = 'List tmux sessions'

  async run(): Promise<void> {
    const tmux = this.getTmuxManager()
    const sessions = await tmux.listSessions()
    if (sessions.length === 0) {
      this.log('No tmux sessions.')
      return
    }
    for (const s of sessions) {
      this.log(`${s.name}\tactive=${s.active}\tcreated=${s.createdAt.toISOString()}`)
    }
  }
}

