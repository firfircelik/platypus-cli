import { Flags } from '@oclif/core'
import { BaseCommand } from '../../base-command.js'
import { AgentRole } from '../../../types/agent.types.js'
import { loadProfile } from '../../../core/profiles.js'

export default class AgentSpawnTeam extends BaseCommand {
  static description = 'Spawn a standard 5-agent team (frontend, backend, devops, qa, pm)'

  static flags = {
    prefix: Flags.string({ default: 'team', description: 'Name prefix for agents' }),
    layout: Flags.string({ default: 'collaborative', description: 'Screen layout' }),
    mode: Flags.string({ default: 'build', description: 'Agent mode (plan|build)' }),
    profile: Flags.string({ required: false, description: 'Profile name (e.g. plan, build)' })
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(AgentSpawnTeam)
    const profile = flags.profile ? loadProfile(flags.profile) : null
    const prevPlatypusMode = process.env.PLATYPUS_MODE
    const prevPlatypusProvider = process.env.PLATYPUS_PROVIDER
    const prevPlatypusModel = process.env.PLATYPUS_MODEL
    const prevPlatypusAutoApprove = process.env.PLATYPUS_AUTO_APPROVE
    const mode = String(profile?.mode ?? flags.mode ?? 'build').toLowerCase()
    process.env.PLATYPUS_MODE = mode
    if (profile?.provider) {
      process.env.PLATYPUS_PROVIDER = profile.provider
    }
    if (profile?.model) {
      process.env.PLATYPUS_MODEL = profile.model
    }
    if (profile?.autoApprove !== undefined) {
      const v = profile.autoApprove ? 'true' : 'false'
      process.env.PLATYPUS_AUTO_APPROVE = v
    }
    const factory = this.getAgentFactory()

    const roles: Array<{ role: AgentRole; name: string; capabilities: string[] }> = [
      { role: AgentRole.FRONTEND_DEVELOPER, name: `${flags.prefix}-frontend`, capabilities: ['ui', 'react', 'css'] },
      { role: AgentRole.BACKEND_DEVELOPER, name: `${flags.prefix}-backend`, capabilities: ['api', 'db'] },
      { role: AgentRole.DEVOPS_ENGINEER, name: `${flags.prefix}-devops`, capabilities: ['ci', 'docker'] },
      { role: AgentRole.QA_TESTER, name: `${flags.prefix}-qa`, capabilities: ['tests'] },
      { role: AgentRole.PROJECT_MANAGER, name: `${flags.prefix}-pm`, capabilities: ['planning'] }
    ]

    try {
      const created = []
      for (const r of roles) {
        const agent = await factory.createAgent({
          name: r.name,
          role: r.role,
          capabilities: r.capabilities,
          layout: flags.layout as any
        })
        created.push(agent)
      }

      for (const a of created) {
        this.log(`${a.id}\t${a.name}\t${a.role}\t${a.sessionName}`)
      }
    } finally {
      if (prevPlatypusMode === undefined) delete process.env.PLATYPUS_MODE
      else process.env.PLATYPUS_MODE = prevPlatypusMode
      if (prevPlatypusProvider === undefined) delete process.env.PLATYPUS_PROVIDER
      else process.env.PLATYPUS_PROVIDER = prevPlatypusProvider
      if (prevPlatypusModel === undefined) delete process.env.PLATYPUS_MODEL
      else process.env.PLATYPUS_MODEL = prevPlatypusModel
      if (prevPlatypusAutoApprove === undefined) delete process.env.PLATYPUS_AUTO_APPROVE
      else process.env.PLATYPUS_AUTO_APPROVE = prevPlatypusAutoApprove
    }
  }
}
