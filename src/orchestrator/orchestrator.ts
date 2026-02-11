import { v4 as uuidv4 } from 'uuid'
import type { Agent, AgentAssignment, AgentMessage, AgentRole, Task } from '../types/agent.types.js'
import { createMessageBus, type MessageBus } from '../state/message-bus.js'

export class Orchestrator {
  private bus: MessageBus

  constructor(bus: MessageBus = createMessageBus()) {
    this.bus = bus
  }

  async assignTask(task: Omit<Task, 'id'>, agents: Agent[]): Promise<AgentAssignment[]> {
    const full: Task = {
      id: uuidv4(),
      description: task.description,
      priority: task.priority,
      type: task.type,
      requirements: task.requirements,
      dependencies: task.dependencies,
      estimatedDuration: task.estimatedDuration,
      timeout: task.timeout
    }

    const selected = this.routeTask(full, agents)
    return selected.map(agent => ({
      agentId: agent.id,
      task: full,
      status: 'pending'
    }))
  }

  routeTask(task: Task, agents: Agent[]): Agent[] {
    const preferredRoles = this.inferRoles(task.description)
    const filtered = agents.filter(a => preferredRoles.includes(a.role as AgentRole))
    if (filtered.length > 0) return filtered
    return agents
  }

  async broadcast(from: string, content: string, metadata?: Record<string, unknown>): Promise<AgentMessage> {
    return this.bus.publish({
      from,
      to: '*',
      type: 'broadcast',
      content,
      metadata
    })
  }

  async message(from: string, to: string | string[], content: string, metadata?: Record<string, unknown>): Promise<AgentMessage> {
    return this.bus.publish({
      from,
      to,
      type: 'request',
      content,
      metadata
    })
  }

  async subscribe(handler: (msg: AgentMessage) => void): Promise<() => Promise<void>> {
    return this.bus.subscribe(handler)
  }

  async close(): Promise<void> {
    await this.bus.close()
  }

  private inferRoles(text: string): AgentRole[] {
    const normalized = text.toLowerCase()
    const roles: AgentRole[] = []

    if (/(ui|ux|react|vue|svelte|css|tailwind|frontend)/.test(normalized)) roles.push('frontend-dev' as AgentRole)
    if (/(api|database|sql|postgres|redis|backend|server|node|python|go)/.test(normalized)) roles.push('backend-dev' as AgentRole)
    if (/(docker|k8s|kubernetes|ci\/cd|deploy|infra|devops)/.test(normalized)) roles.push('devops' as AgentRole)
    if (/(test|qa|e2e|unit test|integration)/.test(normalized)) roles.push('qa' as AgentRole)
    if (/(plan|roadmap|milestone|scope|project manager|pm)/.test(normalized)) roles.push('pm' as AgentRole)
    if (/(architecture|design|system|scalability)/.test(normalized)) roles.push('architect' as AgentRole)
    if (/(security|vulnerability|owasp|auth|encryption)/.test(normalized)) roles.push('security' as AgentRole)

    if (roles.length === 0) {
      roles.push('fullstack-dev' as AgentRole)
    }

    return roles
  }
}
