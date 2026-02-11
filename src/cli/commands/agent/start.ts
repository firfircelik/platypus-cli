import { Flags } from '@oclif/core'
import { BaseCommand } from '../../base-command.js'
import { AgentState } from '../../../types/agent.types.js'

export default class AgentStart extends BaseCommand {
  static description = 'Mark an agent as running and optionally attach to its session'

  static flags = {
    id: Flags.string({ char: 'i', required: true, description: 'Agent id' }),
    attach: Flags.boolean({ default: false, description: 'Attach to tmux session after starting' })
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(AgentStart)
    const store = this.getAgentStore()
    const agent = store.get(flags.id)
    if (!agent) this.error(`Agent not found: ${flags.id}`)

    agent.state = AgentState.RUNNING
    agent.updatedAt = new Date()
    agent.lastActivity = new Date()
    store.upsert(agent)

    this.getAudit().write({ agentId: agent.id, action: 'agent.start', resource: agent.sessionName, details: {} })
    this.log(`Started agent ${agent.id} session=${agent.sessionName}`)

    if (flags.attach) {
      await this.getTmuxManager().attachSessionName(agent.sessionName)
    }
  }
}

