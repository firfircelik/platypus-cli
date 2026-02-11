import { EventEmitter } from 'node:events'
import Redis from 'ioredis'
import { v4 as uuidv4 } from 'uuid'
import type { AgentMessage } from '../types/agent.types.js'

export interface MessageBus {
  publish(message: Omit<AgentMessage, 'id' | 'timestamp'> & { id?: string; timestamp?: Date }): Promise<AgentMessage>
  subscribe(handler: (message: AgentMessage) => void): Promise<() => Promise<void>>
  close(): Promise<void>
}

export class InMemoryMessageBus implements MessageBus {
  private emitter = new EventEmitter()

  async publish(message: Omit<AgentMessage, 'id' | 'timestamp'> & { id?: string; timestamp?: Date }): Promise<AgentMessage> {
    const full: AgentMessage = {
      id: message.id ?? uuidv4(),
      from: message.from,
      to: message.to,
      type: message.type,
      content: message.content,
      metadata: message.metadata,
      timestamp: message.timestamp ?? new Date()
    }
    this.emitter.emit('message', full)
    return full
  }

  async subscribe(handler: (message: AgentMessage) => void): Promise<() => Promise<void>> {
    this.emitter.on('message', handler)
    return async () => {
      this.emitter.off('message', handler)
    }
  }

  async close(): Promise<void> {
    this.emitter.removeAllListeners()
  }
}

export class RedisMessageBus implements MessageBus {
  private pub: Redis
  private sub: Redis
  private channel: string
  private subscribed = false

  constructor(redisUrl: string, channel: string = 'platypus:bus') {
    this.pub = new Redis(redisUrl, { lazyConnect: true })
    this.sub = new Redis(redisUrl, { lazyConnect: true })
    this.channel = channel
  }

  async publish(message: Omit<AgentMessage, 'id' | 'timestamp'> & { id?: string; timestamp?: Date }): Promise<AgentMessage> {
    const full: AgentMessage = {
      id: message.id ?? uuidv4(),
      from: message.from,
      to: message.to,
      type: message.type,
      content: message.content,
      metadata: message.metadata,
      timestamp: message.timestamp ?? new Date()
    }
    await this.pub.connect()
    await this.pub.publish(this.channel, JSON.stringify(full))
    return full
  }

  async subscribe(handler: (message: AgentMessage) => void): Promise<() => Promise<void>> {
    await this.sub.connect()
    if (!this.subscribed) {
      await this.sub.subscribe(this.channel)
      this.subscribed = true
    }

    const listener = (_channel: string, payload: string) => {
      try {
        const parsed = JSON.parse(payload) as AgentMessage
        parsed.timestamp = new Date(parsed.timestamp)
        handler(parsed)
      } catch {
        return
      }
    }

    this.sub.on('message', listener)

    return async () => {
      this.sub.off('message', listener)
    }
  }

  async close(): Promise<void> {
    await this.pub.quit()
    await this.sub.quit()
  }
}

export function createMessageBus(): MessageBus {
  const url = process.env.PLATYPUS_REDIS_URL
  if (url) return new RedisMessageBus(url)
  return new InMemoryMessageBus()
}
