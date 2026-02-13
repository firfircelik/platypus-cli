import { pathToFileURL } from 'node:url'
import { JsonRpcClient } from './json-rpc.js'

export type LspConfig = {
  command: string
  args?: string[]
  cwd?: string
  root: string
}

export function loadLspConfigFromEnv(root: string): LspConfig | null {
  const command = process.env.PLATYPUS_LSP_COMMAND
  if (!command || command.trim().length === 0) return null
  const rawArgs = process.env.PLATYPUS_LSP_ARGS
  let args: string[] | undefined
  if (rawArgs && rawArgs.trim().length > 0) {
    const trimmed = rawArgs.trim()
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) args = parsed.map((a: any) => String(a))
      } catch {
        args = trimmed.split(' ').filter(Boolean)
      }
    } else {
      args = trimmed.split(' ').filter(Boolean)
    }
  }
  return { command: command.trim(), args, root }
}

export class LspManager {
  private config: LspConfig
  private client: JsonRpcClient | null = null
  private initialized = false

  constructor(config: LspConfig) {
    this.config = config
  }

  async request<T = any>(method: string, params?: any): Promise<T> {
    const client = await this.ensureInitialized()
    return client.request<T>(method, params)
  }

  close(): void {
    if (this.client) this.client.close()
    this.client = null
    this.initialized = false
  }

  private async ensureInitialized(): Promise<JsonRpcClient> {
    if (this.client && this.initialized) return this.client
    const client = this.client ?? new JsonRpcClient(this.config.command, this.config.args ?? [], { cwd: this.config.cwd ?? this.config.root })
    this.client = client
    const rootUri = pathToFileURL(this.config.root).toString()
    await client.request('initialize', {
      processId: process.pid,
      rootUri,
      capabilities: {},
      workspaceFolders: [{ uri: rootUri, name: 'workspace' }]
    })
    client.notify('initialized', {})
    this.initialized = true
    return client
  }
}
