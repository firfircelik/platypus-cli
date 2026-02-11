import { describe, expect, it } from 'vitest'
import { parseAgentRuntimeArgs } from '../src/agent/agent-runtime.js'

describe('agent runtime', () => {
  it('parses args', () => {
    const a = parseAgentRuntimeArgs(['node', 'agent-runtime.js', '--agentId', 'a1', '--provider', 'openai', '--root', '/tmp', '--autoApprove'])
    expect(a.agentId).toBe('a1')
    expect(a.provider).toBe('openai')
    expect(a.root).toBe('/tmp')
    expect(a.autoApprove).toBe(true)
    expect(a.mode).toBe('build')
  })

  it('throws when agentId is missing', () => {
    expect(() => parseAgentRuntimeArgs(['node', 'agent-runtime.js'])).toThrow(/Missing --agentId/)
  })
})
