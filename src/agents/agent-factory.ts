import { v4 as uuidv4 } from 'uuid'
import { fileURLToPath } from 'node:url'
import { TmuxManager } from '../screen/tmux-manager.js'
import { AgentState } from '../types/agent.types.js'
import type { Agent, AgentConfig, AgentRole, SharedContext, Task, SessionConfig, ScreenLayout } from '../types/agent.types.js'
import { AgentStore } from '../state/agent-store.js'
import { AuditLogger } from '../core/audit.js'

interface AgentFactoryConfig {
  maxAgents: number
  defaultLayout: string
  defaultModel: string
  defaultTemperature: number
  defaultMaxTokens: number
}

const DEFAULT_FACTORY_CONFIG: AgentFactoryConfig = {
  maxAgents: 10,
  defaultLayout: 'dev',
  defaultModel: 'gpt-4',
  defaultTemperature: 0.7,
  defaultMaxTokens: 4096
}

export class AgentFactory {
  private agents: Map<string, Agent>
  private tmuxManager: TmuxManager
  private config: AgentFactoryConfig
  private store: AgentStore
  private audit: AuditLogger

  constructor(config: Partial<AgentFactoryConfig> = {}) {
    this.agents = new Map()
    this.tmuxManager = new TmuxManager()
    this.config = { ...DEFAULT_FACTORY_CONFIG, ...config }
    this.store = new AgentStore()
    this.audit = new AuditLogger()
  }

  async initialize(): Promise<void> {
    return
  }

  async createAgent(config: AgentConfig): Promise<Agent> {
    if (this.agents.size >= this.config.maxAgents) {
      throw new Error(`Maximum agent limit reached: ${this.config.maxAgents}`)
    }

    const agentId = config.id || uuidv4()
    const sessionName = config.sessionName || `agent-${agentId.slice(0, 8)}`
    const runtimePath = fileURLToPath(new URL('../agent/agent-runtime.js', import.meta.url))
    const root = process.cwd()
    const model = process.env.PLATYPUS_MODEL
    const provider = process.env.PLATYPUS_PROVIDER
    const autoApprove = process.env.PLATYPUS_AUTO_APPROVE
    const mode = process.env.PLATYPUS_MODE
    const modelArg = model ? ` --model ${shellQuote(model)}` : ''
    const runtimeCommand = `node ${shellQuote(runtimePath)} --agentId ${shellQuote(agentId)} --provider ${shellQuote(
      (provider ?? 'openai').toLowerCase()
    )}${modelArg} --root ${shellQuote(root)} --autoApprove ${shellQuote(autoApprove ?? 'false')} --mode ${shellQuote(
      (mode ?? 'build').toLowerCase()
    )}`

    const sessionConfig: SessionConfig = {
      name: sessionName,
      layout: ((config.layout ?? 'dev') as unknown) as ScreenLayout,
      panes: [
        {
          id: uuidv4(),
          title: 'Main',
          command: runtimeCommand,
          focus: true
        }
      ],
      environment: { PLATYPUS_PROJECT_ROOT: root, PLATYPUS_AGENT_ID: agentId }
    }

    const { session } = await this.tmuxManager.createSession(sessionConfig)
    const paneId = this.tmuxManager.getDefaultPaneId(session.id)

    const agent: Agent = {
      id: agentId,
      name: config.name,
      role: config.role,
      capabilities: config.capabilities,
      sessionId: session.id,
      sessionName,
      paneId,
      state: AgentState.IDLE,
      context: this.createSharedContext(),
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActivity: new Date()
    }

    this.agents.set(agentId, agent)
    this.store.upsert(agent)
    this.audit.write({ agentId, action: 'agent.create', resource: sessionName, details: { role: agent.role } })
    return agent
  }

  async startAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId)
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`)
    }

    if (agent.state !== AgentState.IDLE && agent.state !== AgentState.STOPPED) {
      throw new Error(`Agent is not in a startable state: ${agent.state}`)
    }

    agent.state = AgentState.STARTING
    agent.updatedAt = new Date()

    try {
      agent.state = AgentState.RUNNING
      agent.lastActivity = new Date()
      agent.updatedAt = new Date()
      this.store.upsert(agent)
      this.audit.write({ agentId, action: 'agent.start', resource: agent.sessionId, details: {} })
    } catch (error) {
      agent.state = AgentState.ERROR
      this.store.upsert(agent)
      throw error
    }
  }

  async stopAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId)
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`)
    }

    agent.state = AgentState.STOPPING
    agent.updatedAt = new Date()

    try {
      agent.state = AgentState.STOPPED
      agent.updatedAt = new Date()
      this.store.upsert(agent)
      this.audit.write({ agentId, action: 'agent.stop', resource: agent.sessionId, details: {} })
    } catch (error) {
      agent.state = AgentState.ERROR
      this.store.upsert(agent)
      throw error
    }
  }

  async pauseAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId)
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`)
    }

    if (agent.state !== AgentState.RUNNING) {
      throw new Error(`Agent is not running: ${agent.state}`)
    }

    agent.state = AgentState.PAUSED
    agent.updatedAt = new Date()
  }

  async resumeAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId)
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`)
    }

    if (agent.state !== AgentState.PAUSED) {
      throw new Error(`Agent is not paused: ${agent.state}`)
    }

    agent.state = AgentState.RUNNING
    agent.updatedAt = new Date()
    agent.lastActivity = new Date()
  }

  async destroyAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId)
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`)
    }

    try {
      await this.tmuxManager.killSession(agent.sessionId)
      this.agents.delete(agentId)
      this.store.delete(agentId)
      this.audit.write({ agentId, action: 'agent.destroy', resource: agent.sessionId, details: {} })
    } catch (error) {
      throw new Error(`Failed to destroy agent: ${error}`)
    }
  }

  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId)
  }

  listAgents(): Agent[] {
    return Array.from(this.agents.values())
  }

  listAgentsByRole(role: AgentRole): Agent[] {
    return this.listAgents().filter(agent => agent.role === role)
  }

  async executeTask(agentId: string, task: Task): Promise<unknown> {
    const agent = this.agents.get(agentId)
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`)
    }

    if (agent.state !== AgentState.RUNNING) {
      throw new Error(`Agent is not running: ${agent.state}`)
    }

    agent.lastActivity = new Date()
    this.store.upsert(agent)
    this.audit.write({ agentId, action: 'task.execute', resource: task.id, details: { description: task.description } })

    await this.tmuxManager.sendCommand(agent.paneId, `Task: ${task.description}`)

    return { taskId: task.id, status: 'started' }
  }

  private createSharedContext(): SharedContext {
    return {
      projectRoot: process.cwd(),
      files: new Map(),
      dependencies: {
        nodes: new Map(),
        edges: new Map()
      },
      configuration: {
        name: '',
        version: '',
        language: '',
        framework: '',
        buildCommand: '',
        testCommand: '',
        startCommand: ''
      },
      agentStates: new Map(),
      variables: new Map()
    }
  }

  async cleanup(): Promise<void> {
    for (const [agentId] of this.agents) {
      try {
        await this.destroyAgent(agentId)
      } catch (error) {
        void error
      }
    }

    await this.tmuxManager.cleanup()
  }

  getStats(): {
    totalAgents: number
    runningAgents: number
    idleAgents: number
    errorAgents: number
  } {
    const agents = this.listAgents()
    return {
      totalAgents: agents.length,
      runningAgents: agents.filter(a => a.state === AgentState.RUNNING).length,
      idleAgents: agents.filter(a => a.state === AgentState.IDLE).length,
      errorAgents: agents.filter(a => a.state === AgentState.ERROR).length
    }
  }
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`
}
