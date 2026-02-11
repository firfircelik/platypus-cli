import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const executeMock = vi.fn(async () => undefined)

vi.mock('@oclif/core', () => ({
  execute: executeMock
}))

describe('CLI default argv', () => {
  const originalArgv = process.argv

  beforeEach(() => {
    executeMock.mockClear()
    vi.resetModules()
  })

  afterEach(() => {
    process.argv = originalArgv
  })

  it('defaults to chat when no args provided', async () => {
    process.argv = ['node', 'bin/platypus.js']
    await import('../src/cli/index.js')
    expect(executeMock).toHaveBeenCalledTimes(1)
    expect(executeMock.mock.calls[0][0].args).toEqual(['chat'])
  })

  it('preserves argv when args are provided', async () => {
    process.argv = ['node', 'bin/platypus.js', '--help']
    await import('../src/cli/index.js')
    expect(executeMock).toHaveBeenCalledTimes(1)
    expect(executeMock.mock.calls[0][0].args).toEqual(['--help'])
  })
})
