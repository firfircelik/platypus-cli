import { describe, expect, it, vi } from 'vitest'

describe('RedisMessageBus', () => {
  it('creates redis bus when env set', async () => {
    const publish = vi.fn(async () => 1)
    const subscribe = vi.fn(async () => 1)
    const connect = vi.fn(async () => undefined)
    const quit = vi.fn(async () => undefined)
    const listeners: Array<(channel: string, payload: string) => void> = []
    const on = vi.fn((_event: string, cb: any) => listeners.push(cb))
    const off = vi.fn((_event: string, cb: any) => {
      const idx = listeners.indexOf(cb)
      if (idx >= 0) listeners.splice(idx, 1)
    })

    await vi.resetModules()
    vi.doMock('ioredis', () => ({
      default: class {
        constructor() {}
        connect = connect
        publish = publish
        subscribe = subscribe
        quit = quit
        on = on
        off = off
      }
    }))

    process.env.PLATYPUS_REDIS_URL = 'redis://localhost:6379'
    const mod = await import('../src/state/message-bus.js')
    const bus = mod.createMessageBus()
    const received: string[] = []
    const unsub = await bus.subscribe(m => received.push(m.content))
    await bus.publish({ from: 'a', to: '*', type: 'broadcast', content: 'x' })
    listeners.forEach(l =>
      l(
        'platypus:bus',
        JSON.stringify({ id: '1', from: 'a', to: '*', type: 'broadcast', content: 'm', timestamp: new Date().toISOString() })
      )
    )
    expect(received).toEqual(['m'])
    await unsub()
    await bus.close()

    expect(connect).toHaveBeenCalled()
    expect(publish).toHaveBeenCalled()
    delete process.env.PLATYPUS_REDIS_URL
  })
})
