import { spawn } from 'node:child_process'

type PendingRequest = {
  resolve: (value: any) => void
  reject: (error: Error) => void
}

export type JsonRpcClientOptions = {
  cwd?: string
}

export class JsonRpcClient {
  private proc
  private nextId = 1
  private pending = new Map<number, PendingRequest>()
  private buffer = Buffer.alloc(0)
  private closed = false

  constructor(command: string, args: string[] = [], options: JsonRpcClientOptions = {}) {
    this.proc = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], cwd: options.cwd })
    this.proc.stdout.on('data', data => this.onData(data))
    this.proc.on('error', err => this.failAll(err instanceof Error ? err : new Error('Process error')))
    this.proc.on('exit', () => this.failAll(new Error('Process exited')))
  }

  async request<T = any>(method: string, params?: any): Promise<T> {
    const id = this.nextId++
    const payload = { jsonrpc: '2.0', id, method, params }
    this.send(payload)
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
    })
  }

  notify(method: string, params?: any): void {
    const payload = { jsonrpc: '2.0', method, params }
    this.send(payload)
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    this.proc.kill()
  }

  private send(payload: any): void {
    const body = JSON.stringify(payload)
    const header = `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n`
    this.proc.stdin.write(header + body, 'utf8')
  }

  private onData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk])
    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n')
      if (headerEnd === -1) return
      const headerText = this.buffer.slice(0, headerEnd).toString('utf8')
      const match = headerText.match(/Content-Length:\s*(\d+)/i)
      if (!match) {
        this.buffer = this.buffer.slice(headerEnd + 4)
        continue
      }
      const length = Number(match[1])
      const bodyStart = headerEnd + 4
      if (this.buffer.length < bodyStart + length) return
      const bodyText = this.buffer.slice(bodyStart, bodyStart + length).toString('utf8')
      this.buffer = this.buffer.slice(bodyStart + length)
      let msg: any
      try {
        msg = JSON.parse(bodyText)
      } catch {
        continue
      }
      this.handleMessage(msg)
    }
  }

  private handleMessage(msg: any): void {
    if (msg && Object.prototype.hasOwnProperty.call(msg, 'id')) {
      const pending = this.pending.get(msg.id)
      if (!pending) return
      this.pending.delete(msg.id)
      if (msg.error) {
        const errMsg = msg.error?.message ? String(msg.error.message) : 'JSON-RPC error'
        pending.reject(new Error(errMsg))
      } else {
        pending.resolve(msg.result)
      }
    }
  }

  private failAll(error: Error): void {
    if (this.closed) return
    for (const pending of this.pending.values()) {
      pending.reject(error)
    }
    this.pending.clear()
  }
}
