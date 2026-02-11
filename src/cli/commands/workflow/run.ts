import { Args, Flags } from '@oclif/core'
import fs from 'node:fs'
import path from 'node:path'
import YAML from 'yaml'
import { BaseCommand } from '../../base-command.js'
import { AgentTaskStore } from '../../../state/agent-task-store.js'
import { WorkflowStore } from '../../../state/workflow-store.js'
import type { AgentRole } from '../../../types/agent.types.js'
import { loadProfile } from '../../../core/profiles.js'

type WorkflowYaml = {
  project?: { name?: string; root?: string }
  team?: { agents?: Array<{ name: string; role: AgentRole; capabilities?: string[]; layout?: string }> }
  workflow?: Array<{ task: string; routing?: string }>
}

export default class WorkflowRun extends BaseCommand {
  static description = 'Run a workflow YAML (team + tasks)'

  static args = {
    file: Args.string({ required: true, description: 'Path to workflow yaml' })
  }

  static flags = {
    wait: Flags.integer({ default: 0, description: 'Wait for completion (seconds)' }),
    follow: Flags.boolean({ default: false, description: 'Stream task results while waiting' }),
    profile: Flags.string({ required: false, description: 'Profile name for spawned agents' })
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(WorkflowRun)
    const filePath = path.resolve(process.cwd(), args.file)
    const raw = fs.readFileSync(filePath, 'utf8')
    const doc = YAML.parse(raw) as WorkflowYaml

    const root = doc.project?.root ? path.resolve(path.dirname(filePath), doc.project.root) : process.cwd()
    const name = doc.project?.name ?? path.basename(root)
    const workflow = doc.workflow ?? []
    const teamAgents = doc.team?.agents ?? []

    const wfStore = new WorkflowStore()
    const wfRun = wfStore.createRun(`workflow:${name}`, root)
    wfStore.setRunStatus(wfRun.id, 'running')

    const profile = flags.profile ? loadProfile(flags.profile) : null
    const prevPlatypusMode = process.env.PLATYPUS_MODE
    const prevPlatypusProvider = process.env.PLATYPUS_PROVIDER
    const prevPlatypusModel = process.env.PLATYPUS_MODEL
    const prevPlatypusAutoApprove = process.env.PLATYPUS_AUTO_APPROVE
    if (profile) {
      process.env.PLATYPUS_MODE = profile.mode
      if (profile.provider) {
        process.env.PLATYPUS_PROVIDER = profile.provider
      }
      if (profile.model) {
        process.env.PLATYPUS_MODEL = profile.model
      }
      if (profile.autoApprove !== undefined) {
        const v = profile.autoApprove ? 'true' : 'false'
        process.env.PLATYPUS_AUTO_APPROVE = v
      }
    }

    const factory = this.getAgentFactory()
    await factory.initialize()

    const agentStore = this.getAgentStore()
    const existingAgents = agentStore.list()
    const agents = [...existingAgents]

    try {
      for (const a of teamAgents) {
        const exists = agents.some(x => x.name === a.name)
        if (exists) continue
        const created = await factory.createAgent({
          name: a.name,
          role: a.role,
          capabilities: a.capabilities ?? [],
          layout: (a.layout ?? 'collaborative') as any
        })
        agents.push(created)
      }

      const orchestrator = this.getOrchestrator()
      const tmux = this.getTmuxManager()
      const tasks = new AgentTaskStore()
      const allTaskIds: string[] = []

      for (const item of workflow) {
        const step = wfStore.addStep(wfRun.id, 'task', item.task)
        wfStore.setStepStatus(step.id, 'running')
        const assignments = await orchestrator.assignTask(
          {
            description: item.task,
            priority: 'high',
            type: 'nl',
            requirements: {},
            dependencies: []
          },
          agents
        )
        for (const assignment of assignments) {
          const agent = agents.find(a => a.id === assignment.agentId)
          if (!agent) continue
          const t = tasks.enqueue(agent.id, assignment.task.description)
          allTaskIds.push(t.id)
          await tmux.sendCommandToSession(agent.sessionName, `Platypus task: ${assignment.task.description}`)
        }
        wfStore.setStepStatus(step.id, 'done', `enqueued:${assignments.length}`)
      }

      if (flags.wait > 0 && allTaskIds.length > 0) {
        const deadline = Date.now() + flags.wait * 1000
        const seen = new Set<string>()
        while (Date.now() < deadline) {
          const states = allTaskIds.map(id => tasks.get(id)?.status ?? 'pending')
          if (flags.follow) {
            for (const id of allTaskIds) {
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
      }

      wfStore.setRunStatus(wfRun.id, 'done')
      this.log(`Workflow run id: ${wfRun.id}`)
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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
