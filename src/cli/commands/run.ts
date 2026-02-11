import { Args, Flags } from '@oclif/core'
import { BaseCommand } from '../base-command.js'
import { AgentRole } from '../../types/agent.types.js'
import { AgentTaskStore } from '../../state/agent-task-store.js'

export default class Run extends BaseCommand {
  static description = 'Execute a natural-language task using the agent team'

  static args = {
    task: Args.string({ required: true, description: 'Task description' })
  }

  static flags = {
    ensureTeam: Flags.boolean({ default: true, description: 'Ensure at least 5 agents exist' }),
    wait: Flags.integer({ default: 0, description: 'Wait for completion (seconds)' }),
    follow: Flags.boolean({ default: false, description: 'Stream task results while waiting' })
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Run)
    const store = this.getAgentStore()
    let agents = store.list()

    if (flags.ensureTeam && agents.length < 5) {
      const factory = this.getAgentFactory()
      await factory.createAgent({ name: 'team-frontend', role: AgentRole.FRONTEND_DEVELOPER, capabilities: ['ui'], layout: 'collaborative' as any })
      await factory.createAgent({ name: 'team-backend', role: AgentRole.BACKEND_DEVELOPER, capabilities: ['api'], layout: 'collaborative' as any })
      await factory.createAgent({ name: 'team-devops', role: AgentRole.DEVOPS_ENGINEER, capabilities: ['infra'], layout: 'collaborative' as any })
      await factory.createAgent({ name: 'team-qa', role: AgentRole.QA_TESTER, capabilities: ['tests'], layout: 'collaborative' as any })
      await factory.createAgent({ name: 'team-pm', role: AgentRole.PROJECT_MANAGER, capabilities: ['planning'], layout: 'collaborative' as any })
      agents = store.list()
    }

    const orchestrator = this.getOrchestrator()
    const assignments = await orchestrator.assignTask(
      {
        description: args.task,
        priority: 'high',
        type: 'nl',
        requirements: {},
        dependencies: []
      },
      agents
    )

    const tmux = this.getTmuxManager()
    const tasks = new AgentTaskStore()
    const taskIds: string[] = []
    for (const assignment of assignments) {
      const agent = agents.find(a => a.id === assignment.agentId)
      if (!agent) continue
      const t = tasks.enqueue(agent.id, assignment.task.description)
      taskIds.push(t.id)
      await tmux.sendCommandToSession(agent.sessionName, `Platypus task: ${assignment.task.description}`)
    }

    await orchestrator.broadcast('platypus', `New task assigned: ${args.task}`, { assignmentCount: assignments.length })
    this.log(`Assigned task to ${assignments.length} agent(s)`)

    if (flags.wait > 0 && taskIds.length > 0) {
      const deadline = Date.now() + flags.wait * 1000
      const seen = new Set<string>()
      while (Date.now() < deadline) {
        const states = taskIds.map(id => tasks.get(id)?.status ?? 'pending')
        if (flags.follow) {
          for (const id of taskIds) {
            if (seen.has(id)) continue
            const t = tasks.get(id)
            if (!t) continue
            if (t.status === 'done' || t.status === 'failed') {
              const r = tasks.getResult(id)
              const snippet = (r?.output ?? '').trim().slice(0, 500)
              this.log(`${id}  ${t.status}${snippet ? `  ${snippet}` : ''}`)
              seen.add(id)
            }
          }
        }
        if (states.every(s => s === 'done' || s === 'failed')) break
        await sleep(500)
      }
      for (const id of taskIds) {
        const t = tasks.get(id)
        const r = tasks.getResult(id)
        const status = t?.status ?? 'unknown'
        const snippet = (r?.output ?? '').trim().slice(0, 200)
        this.log(`${id}  ${status}${snippet ? `  ${snippet}` : ''}`)
      }
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
