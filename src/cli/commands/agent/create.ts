import { Flags } from '@oclif/core'
import { BaseCommand } from '../../base-command.js'
import { AgentRole } from '../../../types/agent.types.js'

export default class AgentCreate extends BaseCommand {
  static description = 'Create a new agent with an isolated tmux session'

  static flags = {
    name: Flags.string({ char: 'n', required: true, description: 'Agent name' }),
    role: Flags.string({ char: 'r', required: true, description: 'Agent role' }),
    capabilities: Flags.string({ char: 'c', multiple: true, default: [], description: 'Capability identifiers' }),
    layout: Flags.string({ default: 'dev', description: 'Screen layout' })
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(AgentCreate)

    const role = flags.role as AgentRole
    const factory = this.getAgentFactory()
    const agent = await factory.createAgent({
      name: flags.name,
      role,
      capabilities: flags.capabilities,
      layout: flags.layout as any
    })

    this.log(`Created agent ${agent.id} (${agent.role}) session=${agent.sessionName}`)
  }
}

