import { Flags } from '@oclif/core'
import { BaseCommand } from '../../base-command.js'
import { AgentState } from '../../../types/agent.types.js'

export default class AgentStop extends BaseCommand {
  static description = 'Mark an agent as stopped'

  static flags = {
    id: Flags.string({ char: 'i', required: true, description: 'Agent id' })
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(AgentStop)
    const store = this.getAgentStore()
    const agent = store.get(flags.id)
    if (!agent) this.error(`Agent not found: ${flags.id}`)

    agent.state = AgentState.STOPPED
    agent.updatedAt = new Date()
    store.upsert(agent)

    this.getAudit().write({ agentId: agent.id, action: 'agent.stop', resource: agent.sessionName, details: {} })
    this.log(`Stopped agent ${agent.id}`)
  }
}

