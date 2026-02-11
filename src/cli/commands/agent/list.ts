import { BaseCommand } from '../../base-command.js'

export default class AgentList extends BaseCommand {
  static description = 'List persisted agents'

  async run(): Promise<void> {
    const store = this.getAgentStore()
    const agents = store.list()
    if (agents.length === 0) {
      this.log('No agents.')
      return
    }
    for (const a of agents) {
      this.log(`${a.id}\t${a.name}\t${a.role}\t${a.state}\t${a.sessionName}`)
    }
  }
}

