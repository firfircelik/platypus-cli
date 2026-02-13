import { JsonRpcClient } from './json-rpc.js'

export type McpServerConfig = {
  name: string
  command: string
  args?: string[]
  cwd?: string
}

export function loadMcpServersFromEnv(): McpServerConfig[] {
  const raw = process.env.PLATYPUS_MCP_SERVERS
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((s: any) => ({
        name: String(s?.name ?? '').trim(),
        command: String(s?.command ?? '').trim(),
        args: Array.isArray(s?.args) ? s.args.map((a: any) => String(a)) : undefined,
        cwd: s?.cwd ? String(s.cwd) : undefined
      }))
      .filter(s => s.name.length > 0 && s.command.length > 0)
  } catch {
    return []
  }
}

type McpTool = {
  name: string
  description?: string
  inputSchema?: any
}

export class McpManager {
  private servers: Map<string, McpServerConfig>
  private clients: Map<string, JsonRpcClient>

  constructor(servers: McpServerConfig[]) {
    this.servers = new Map(servers.map(s => [s.name, s]))
    this.clients = new Map()
  }

  listServerNames(): string[] {
    return [...this.servers.keys()]
  }

  async listTools(serverName: string): Promise<McpTool[]> {
    const client = this.getClient(serverName)
    const res = await client.request<any>('tools/list', {})
    const tools = Array.isArray(res?.tools) ? res.tools : []
    return tools.map((t: any) => ({
      name: String(t?.name ?? ''),
      description: t?.description ? String(t.description) : undefined,
      inputSchema: t?.inputSchema ?? t?.parameters ?? undefined
    }))
  }

  async listAllTools(): Promise<{ server: string; tools: McpTool[] }[]> {
    const out: { server: string; tools: McpTool[] }[] = []
    for (const name of this.listServerNames()) {
      out.push({ server: name, tools: await this.listTools(name) })
    }
    return out
  }

  async callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<string> {
    const client = this.getClient(serverName)
    const res = await client.request<any>('tools/call', { name: toolName, arguments: args })
    const content = Array.isArray(res?.content) ? res.content : []
    const text = content
      .map((c: any) => (typeof c?.text === 'string' ? c.text : typeof c?.data === 'string' ? c.data : null))
      .filter(Boolean)
      .join('\n')
    if (text.length > 0) return text
    return JSON.stringify(res)
  }

  private getClient(serverName: string): JsonRpcClient {
    const existing = this.clients.get(serverName)
    if (existing) return existing
    const server = this.servers.get(serverName)
    if (!server) throw new Error(`MCP server not found: ${serverName}`)
    const client = new JsonRpcClient(server.command, server.args ?? [], { cwd: server.cwd })
    this.clients.set(serverName, client)
    return client
  }
}
