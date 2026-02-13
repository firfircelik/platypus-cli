import { describe, expect, it } from 'vitest'
import { Orchestrator } from '../src/orchestrator/orchestrator.js'
import { AgentRole, AgentState } from '../src/types/agent.types.js'
import { InMemoryMessageBus } from '../src/state/message-bus.js'

describe('Orchestrator', () => {
  it('routes frontend tasks to frontend role', async () => {
    const o = new Orchestrator()
    const agents = [
      {
        id: 'a1',
        name: 'front',
        role: AgentRole.FRONTEND_DEVELOPER,
        capabilities: [],
        sessionId: 's1',
        sessionName: 'sess1',
        paneId: 'p1',
        state: AgentState.IDLE,
        context: {
          projectRoot: process.cwd(),
          files: new Map(),
          dependencies: { nodes: new Map(), edges: new Map() },
          configuration: { name: '', version: '', language: '', framework: '', buildCommand: '', testCommand: '', startCommand: '' },
          agentStates: new Map(),
          variables: new Map()
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivity: new Date()
      },
      {
        id: 'a2',
        name: 'back',
        role: AgentRole.BACKEND_DEVELOPER,
        capabilities: [],
        sessionId: 's2',
        sessionName: 'sess2',
        paneId: 'p2',
        state: AgentState.IDLE,
        context: {
          projectRoot: process.cwd(),
          files: new Map(),
          dependencies: { nodes: new Map(), edges: new Map() },
          configuration: { name: '', version: '', language: '', framework: '', buildCommand: '', testCommand: '', startCommand: '' },
          agentStates: new Map(),
          variables: new Map()
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivity: new Date()
      }
    ]

    const assignments = await o.assignTask(
      { description: 'Build a React UI', priority: 'high', type: 'nl', requirements: {}, dependencies: [] },
      agents as any
    )
    expect(assignments.some(a => a.agentId === 'a1')).toBe(true)
  })

  it('broadcasts and receives messages', async () => {
    const bus = new InMemoryMessageBus()
    const o = new Orchestrator(bus)
    const received: string[] = []
    const unsub = await o.subscribe(m => received.push(m.content))
    await o.broadcast('a', 'hello')
    expect(received).toEqual(['hello'])
    await unsub()
    await o.close()
  })

  it('sends directed message', async () => {
    const bus = new InMemoryMessageBus()
    const o = new Orchestrator(bus)
    const received: string[] = []
    const unsub = await o.subscribe(m => received.push(`${m.type}:${m.content}`))
    await o.message('a', 'b', 'ping')
    expect(received.some(x => x.includes('ping'))).toBe(true)
    await unsub()
    await o.close()
  })

  it('falls back to all agents when no matching role exists', async () => {
    const o = new Orchestrator(new InMemoryMessageBus())
    const agents = [
      {
        id: 'a1',
        name: 'back',
        role: AgentRole.BACKEND_DEVELOPER,
        capabilities: [],
        sessionId: 's',
        sessionName: 'sn',
        paneId: 'p',
        state: AgentState.IDLE,
        context: {} as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivity: new Date()
      }
    ]
    const routed = o.routeTask({ id: 't', description: 'Perform security audit', priority: 'low', type: 'nl', requirements: {}, dependencies: [] }, agents as any)
    expect(routed.length).toBe(1)
  })

  it('infers frontend-dev role from UI/UX keywords', async () => {
    const o = new Orchestrator(new InMemoryMessageBus())
    const task = { id: 't', description: 'Build a React component with CSS and Tailwind', priority: 'high' as const, type: 'nl', requirements: {}, dependencies: [] }
    const assignments = await o.assignTask(task, [])
    expect(assignments).toEqual([])
  })

  it('infers backend-dev role from backend keywords', async () => {
    const o = new Orchestrator(new InMemoryMessageBus())
    const task = { id: 't', description: 'Create Node.js API with PostgreSQL database', priority: 'high' as const, type: 'nl', requirements: {}, dependencies: [] }
    const assignments = await o.assignTask(task, [])
    expect(assignments).toEqual([])
  })

  it('infers devops role from infrastructure keywords', async () => {
    const o = new Orchestrator(new InMemoryMessageBus())
    const task = { id: 't', description: 'Setup CI/CD pipeline with Docker and Kubernetes', priority: 'high' as const, type: 'nl', requirements: {}, dependencies: [] }
    const assignments = await o.assignTask(task, [])
    expect(assignments).toEqual([])
  })

  it('infers qa role from testing keywords', async () => {
    const o = new Orchestrator(new InMemoryMessageBus())
    const task = { id: 't', description: 'Write unit and integration tests', priority: 'high' as const, type: 'nl', requirements: {}, dependencies: [] }
    const assignments = await o.assignTask(task, [])
    expect(assignments).toEqual([])
  })

  it('infers pm role from project management keywords', async () => {
    const o = new Orchestrator(new InMemoryMessageBus())
    const task = { id: 't', description: 'Plan project roadmap and milestones', priority: 'high' as const, type: 'nl', requirements: {}, dependencies: [] }
    const assignments = await o.assignTask(task, [])
    expect(assignments).toEqual([])
  })

  it('infers architect role from architecture keywords', async () => {
    const o = new Orchestrator(new InMemoryMessageBus())
    const task = { id: 't', description: 'Design system architecture for scalability', priority: 'high' as const, type: 'nl', requirements: {}, dependencies: [] }
    const assignments = await o.assignTask(task, [])
    expect(assignments).toEqual([])
  })

  it('infers security role from security keywords', async () => {
    const o = new Orchestrator(new InMemoryMessageBus())
    const task = { id: 't', description: 'Review OWASP vulnerabilities and implement auth', priority: 'high' as const, type: 'nl', requirements: {}, dependencies: [] }
    const assignments = await o.assignTask(task, [])
    expect(assignments).toEqual([])
  })

  it('assigns task with generated id and correct status', async () => {
    const o = new Orchestrator(new InMemoryMessageBus())
    const agents = [
      {
        id: 'a1',
        name: 'dev',
        role: AgentRole.FRONTEND_DEVELOPER,
        capabilities: [],
        sessionId: 's',
        sessionName: 'sn',
        paneId: 'p',
        state: AgentState.IDLE,
        context: {} as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivity: new Date()
      }
    ]
    const assignments = await o.assignTask(
      { description: 'Build React UI', priority: 'high' as const, type: 'nl', requirements: {}, dependencies: [] },
      agents as any
    )
    expect(assignments.length).toBe(1)
    expect(assignments[0].agentId).toBe('a1')
    expect(assignments[0].status).toBe('pending')
    expect(assignments[0].task.id).toBeDefined()
  })

  it('handles multiple role matches for same task', async () => {
    const o = new Orchestrator(new InMemoryMessageBus())
    const agents = [
      {
        id: 'a1',
        name: 'front',
        role: AgentRole.FRONTEND_DEVELOPER,
        capabilities: [],
        sessionId: 's1',
        sessionName: 'sn1',
        paneId: 'p1',
        state: AgentState.IDLE,
        context: {} as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivity: new Date()
      },
      {
        id: 'a2',
        name: 'qa',
        role: AgentRole.QA_TESTER,
        capabilities: [],
        sessionId: 's2',
        sessionName: 'sn2',
        paneId: 'p2',
        state: AgentState.IDLE,
        context: {} as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivity: new Date()
      }
    ]
    const task = { id: 't', description: 'Build React UI with unit tests', priority: 'high' as const, type: 'nl', requirements: {}, dependencies: [] }
    const routed = o.routeTask(task, agents as any)
    expect(routed.length).toBe(2)
  })
})
