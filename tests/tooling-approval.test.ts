import { describe, expect, it, vi } from 'vitest'

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(async () => ({ ok: true }))
  }
}))

import { createDefaultApprovalPrompt } from '../src/engine/tooling.js'

describe('tool approvals', () => {
  it('prompts when autoApprove is false', async () => {
    const approval = createDefaultApprovalPrompt({ autoApprove: false })
    expect(await approval.confirmRun('npm test')).toBe(true)
    expect(await approval.confirmWrite('a.txt', 'diff')).toBe(true)
  })
})

