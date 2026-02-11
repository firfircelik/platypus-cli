import { Flags } from '@oclif/core'
import { BaseCommand } from '../../base-command.js'

export default class AgentDestroy extends BaseCommand {
  static description = 'Destroy an agent and kill its tmux session'

  static flags = {
    id: Flags.string({ char: 'i', required: true, description: 'Agent id' })
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(AgentDestroy)
    const store = this.getAgentStore()
    const agent = store.get(flags.id)
    if (!agent) this.error(`Agent not found: ${flags.id}`)

    await this.getTmuxManager().killSessionName(agent.sessionName)
    store.delete(agent.id)
    this.getAudit().write({ agentId: agent.id, action: 'agent.destroy', resource: agent.sessionName, details: {} })
    this.log(`Destroyed agent ${agent.id}`)
  }
}
