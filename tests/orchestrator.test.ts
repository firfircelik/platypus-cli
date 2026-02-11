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
})
