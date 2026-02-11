import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { spawnSync } from 'node:child_process'
import inquirer from 'inquirer'
import type { Workspace } from '../core/workspace.js'
import type { ToolCall, ToolDefinition, ToolRegistry } from '../llm/types.js'

export type ToolApprovalPrompt = {
  autoApprove: boolean
  confirmRun(command: string): Promise<boolean>
  confirmWrite(relPath: string, diffText: string): Promise<boolean>
}

export function createDefaultApprovalPrompt(input: { autoApprove: boolean }): ToolApprovalPrompt {
  if (input.autoApprove) {
    return {
      autoApprove: true,
      async confirmRun(): Promise<boolean> {
        return true
      },
      async confirmWrite(): Promise<boolean> {
        return true
      }
    }
  }

  return {
    autoApprove: false,
    async confirmRun(command: string): Promise<boolean> {
      const { ok } = await inquirer.prompt<{ ok: boolean }>([
        { type: 'confirm', name: 'ok', message: `Run command? ${command}`, default: false }
      ])
      return ok
    },
    async confirmWrite(relPath: string, diffText: string): Promise<boolean> {
      const preview = diffText.trim().length > 0 ? `\n${diffText}\n` : '\n(no diff)\n'
      process.stdout.write(preview)
      const { ok } = await inquirer.prompt<{ ok: boolean }>([
        { type: 'confirm', name: 'ok', message: `Apply write to ${relPath}?`, default: false }
      ])
      return ok
    }
  }
}

export function createToolRegistry(input: {
  workspace: Workspace
  approval: ToolApprovalPrompt
  agentId: string
  allowedToolNames?: string[]
}): ToolRegistry {
  const pendingWrites: { path: string; content: string; diff: string }[] = []
  const allowed = input.allowedToolNames ? new Set(input.allowedToolNames) : null

  const tools: Record<string, { def: ToolDefinition; run: (args: any) => Promise<string> }> = {
    read_file: {
      def: {
        name: 'read_file',
        description: 'Read a UTF-8 text file from the project workspace',
        parameters: {
          type: 'object',
          properties: { path: { type: 'string' } },
          required: ['path'],
          additionalProperties: false
        }
      },
      async run(args: any): Promise<string> {
        const relPath = String(args?.path ?? '')
        if (!relPath) return 'Error: path is required'
        const content = await input.workspace.readFile(relPath)
        return content
      }
    },
    write_file: {
      def: {
        name: 'write_file',
        description: 'Stage a UTF-8 text file write to the project workspace (requires apply_writes to commit)',
        parameters: {
          type: 'object',
          properties: { path: { type: 'string' }, content: { type: 'string' } },
          required: ['path', 'content'],
          additionalProperties: false
        }
      },
      async run(args: any): Promise<string> {
        const relPath = String(args?.path ?? '')
        const content = String(args?.content ?? '')
        if (!relPath) return 'Error: path is required'
        const full = input.workspace.resolve(relPath)
        await fs.mkdir(path.dirname(full), { recursive: true })
        const before = await fs.readFile(full, 'utf8').catch(() => '')
        const diff = await computeUnifiedDiff(relPath, before, content)
        if (input.approval.autoApprove) {
          await input.workspace.writeFile(input.agentId, relPath, content)
          return diff.trim().length > 0 ? diff : 'OK'
        }
        const existing = pendingWrites.findIndex(w => w.path === relPath)
        if (existing >= 0) pendingWrites.splice(existing, 1)
        pendingWrites.push({ path: relPath, content, diff })
        return diff.trim().length > 0 ? diff : 'Staged'
      }
    },
    show_writes: {
      def: {
        name: 'show_writes',
        description: 'Show currently staged file writes (optionally summary-only)',
        parameters: {
          type: 'object',
          properties: { summaryOnly: { type: 'boolean' } },
          required: [],
          additionalProperties: false
        }
      },
      async run(args: any): Promise<string> {
        if (pendingWrites.length === 0) return ''
        const summaryOnly = Boolean(args?.summaryOnly)
        const header = ['Staged writes:', ...pendingWrites.map((w, i) => `[${i + 1}] ${w.path}`)].join('\n')
        if (summaryOnly) return header
        return [header, '', ...pendingWrites.map(w => w.diff)].join('\n\n')
      }
    },
    apply_writes: {
      def: {
        name: 'apply_writes',
        description: 'Apply staged writes to disk with user approval (optionally select by id)',
        parameters: {
          type: 'object',
          properties: { ids: { type: 'array', items: { type: 'number' } } },
          required: [],
          additionalProperties: false
        }
      },
      async run(args: any): Promise<string> {
        if (pendingWrites.length === 0) return 'Nothing to apply'
        const ids = Array.isArray(args?.ids) ? args.ids.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n)) : null
        const selected = ids && ids.length > 0 ? new Set(ids.map((n: number) => Math.trunc(n)).filter((n: number) => n >= 1)) : null
        let applied = 0
        const remaining: typeof pendingWrites = []
        for (let i = 0; i < pendingWrites.length; i++) {
          const w = pendingWrites[i]
          if (selected && !selected.has(i + 1)) {
            remaining.push(w)
            continue
          }
          const ok = await input.approval.confirmWrite(w.path, w.diff)
          if (!ok) {
            remaining.push(w)
            continue
          }
          await input.workspace.writeFile(input.agentId, w.path, w.content)
          applied += 1
        }
        pendingWrites.splice(0, pendingWrites.length, ...remaining)
        return applied > 0 ? `Applied ${applied} write(s)` : 'No writes applied'
      }
    },
    discard_writes: {
      def: {
        name: 'discard_writes',
        description: 'Discard staged writes (optionally select by id)',
        parameters: {
          type: 'object',
          properties: { ids: { type: 'array', items: { type: 'number' } } },
          required: [],
          additionalProperties: false
        }
      },
      async run(args: any): Promise<string> {
        if (pendingWrites.length === 0) return 'Nothing to discard'
        const ids = Array.isArray(args?.ids) ? args.ids.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n)) : null
        const selected = ids && ids.length > 0 ? new Set(ids.map((n: number) => Math.trunc(n)).filter((n: number) => n >= 1)) : null
        const kept: typeof pendingWrites = []
        let discarded = 0
        for (let i = 0; i < pendingWrites.length; i++) {
          const w = pendingWrites[i]
          if (selected && !selected.has(i + 1)) {
            kept.push(w)
            continue
          }
          discarded += 1
        }
        pendingWrites.splice(0, pendingWrites.length, ...kept)
        return discarded > 0 ? `Discarded ${discarded} write(s)` : 'No writes discarded'
      }
    },
    read_json: {
      def: {
        name: 'read_json',
        description: 'Read a JSON file and return its parsed value as JSON',
        parameters: {
          type: 'object',
          properties: { path: { type: 'string' } },
          required: ['path'],
          additionalProperties: false
        }
      },
      async run(args: any): Promise<string> {
        const relPath = String(args?.path ?? '')
        if (!relPath) return 'Error: path is required'
        const content = await input.workspace.readFile(relPath)
        const parsed = JSON.parse(content)
        return JSON.stringify(parsed, null, 2)
      }
    },
    write_json: {
      def: {
        name: 'write_json',
        description: 'Stage a JSON file write (pretty-printed). Apply with apply_writes',
        parameters: {
          type: 'object',
          properties: { path: { type: 'string' }, value: {} },
          required: ['path', 'value'],
          additionalProperties: false
        }
      },
      async run(args: any): Promise<string> {
        const relPath = String(args?.path ?? '')
        if (!relPath) return 'Error: path is required'
        const content = JSON.stringify(args?.value, null, 2) + '\n'
        return tools.write_file.run({ path: relPath, content })
      }
    },
    search_files: {
      def: {
        name: 'search_files',
        description: 'Search for a text pattern in files under a directory',
        parameters: {
          type: 'object',
          properties: { query: { type: 'string' }, dir: { type: 'string' }, maxResults: { type: 'number' } },
          required: ['query'],
          additionalProperties: false
        }
      },
      async run(args: any): Promise<string> {
        const query = String(args?.query ?? '')
        const dir = String(args?.dir ?? '.')
        const maxResults = Number.isFinite(args?.maxResults) ? Math.max(1, Math.min(200, Number(args.maxResults))) : 50
        if (!query) return 'Error: query is required'
        const cwd = input.workspace.resolve('.')
        const res = spawnSync('rg', ['-n', '--no-heading', '--color', 'never', '--max-count', String(maxResults), query, dir], {
          cwd,
          encoding: 'utf8'
        })
        const out = `${res.stdout ?? ''}${res.stderr ?? ''}`.trim()
        if (res.status === 0) return out
        if (res.status !== null) return out.length > 0 ? out : ''

        const fullDir = input.workspace.resolve(dir)
        const results: string[] = []
        const ignore = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.platypus'])

        const walk = async (abs: string): Promise<void> => {
          if (results.length >= maxResults) return
          let entries: Array<{ name: string; isDirectory: () => boolean; isFile: () => boolean }>
          try {
            entries = await fs.readdir(abs, { withFileTypes: true })
          } catch {
            return
          }
          for (const e of entries) {
            if (results.length >= maxResults) return
            if (ignore.has(e.name)) continue
            const p = path.join(abs, e.name)
            if (e.isDirectory()) {
              await walk(p)
              continue
            }
            if (!e.isFile()) continue
            let content = ''
            try {
              content = await fs.readFile(p, 'utf8')
            } catch {
              continue
            }
            const lines = content.split('\n')
            for (let i = 0; i < lines.length; i++) {
              if (results.length >= maxResults) return
              if (!lines[i].includes(query)) continue
              const rel = path.relative(cwd, p)
              results.push(`${rel}:${i + 1}:${lines[i]}`)
            }
          }
        }

        await walk(fullDir)
        return results.join('\n')
      }
    },
    patch_file: {
      def: {
        name: 'patch_file',
        description: 'Apply a unified diff patch to the workspace using git apply',
        parameters: {
          type: 'object',
          properties: { patch: { type: 'string' } },
          required: ['patch'],
          additionalProperties: false
        }
      },
      async run(args: any): Promise<string> {
        const patchText = String(args?.patch ?? '')
        if (!patchText) return 'Error: patch is required'
        const ok = await input.approval.confirmWrite('patch', patchText)
        if (!ok) return 'Skipped: user declined patch'
        const tmp = path.join(os.tmpdir(), `platypus-patch-${Date.now()}-${Math.random().toString(16).slice(2)}.patch`)
        try {
          await fs.writeFile(tmp, patchText, 'utf8')
          const res = spawnSync('git', ['apply', '--whitespace=nowarn', tmp], { cwd: input.workspace.resolve('.'), encoding: 'utf8' })
          const out = `${res.stdout ?? ''}${res.stderr ?? ''}`.trim()
          if (res.status !== 0) return `Exit ${res.status}\n${out}`
          return out.length > 0 ? out : 'OK'
        } finally {
          await fs.rm(tmp, { force: true }).catch(() => undefined)
        }
      }
    },
    list_files: {
      def: {
        name: 'list_files',
        description: 'List files under a directory (relative to project root)',
        parameters: {
          type: 'object',
          properties: { dir: { type: 'string' } },
          required: ['dir'],
          additionalProperties: false
        }
      },
      async run(args: any): Promise<string> {
        const dir = String(args?.dir ?? '')
        if (!dir) return 'Error: dir is required'
        const full = input.workspace.resolve(dir)
        const entries = await fs.readdir(full, { withFileTypes: true })
        return entries.map(e => (e.isDirectory() ? `${e.name}/` : e.name)).join('\n')
      }
    },
    run_command: {
      def: {
        name: 'run_command',
        description: 'Run a safe shell command in the project root',
        parameters: {
          type: 'object',
          properties: { command: { type: 'string' } },
          required: ['command'],
          additionalProperties: false
        }
      },
      async run(args: any): Promise<string> {
        const command = String(args?.command ?? '')
        if (!command) return 'Error: command is required'
        if (!isAllowedCommand(command)) return 'Denied: command not allowlisted'
        const ok = await input.approval.confirmRun(command)
        if (!ok) return 'Skipped: user declined command'
        const res = spawnSync(command, { cwd: input.workspace.resolve('.'), shell: true, encoding: 'utf8' })
        const out = `${res.stdout ?? ''}${res.stderr ?? ''}`.trim()
        if (res.status !== 0) return `Exit ${res.status}\n${out}`
        return out.length > 0 ? out : 'OK'
      }
    }
  }

  return {
    list(): ToolDefinition[] {
      const all = Object.values(tools).map(t => t.def)
      if (!allowed) return all
      return all.filter(d => allowed.has(d.name))
    },
    async execute(call: ToolCall): Promise<string> {
      if (allowed && !allowed.has(call.name)) return `Denied: tool disabled (${call.name})`
      const tool = tools[call.name]
      if (!tool) return `Error: unknown tool ${call.name}`
      try {
        return await tool.run(call.arguments)
      } catch (error) {
        return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

function isAllowedCommand(command: string): boolean {
  const trimmed = command.trim()
  const allow = [
    'npm test',
    'npm run build',
    'npm run test:coverage',
    'git status',
    'git diff',
    'node --version',
    'npm --version'
  ]
  return allow.some(a => trimmed === a || trimmed.startsWith(`${a} `))
}

async function computeUnifiedDiff(relPath: string, before: string, after: string): Promise<string> {
  const tmpDir = os.tmpdir()
  const a = path.join(tmpDir, `platypus-before-${Date.now()}-${Math.random().toString(16).slice(2)}.txt`)
  const b = path.join(tmpDir, `platypus-after-${Date.now()}-${Math.random().toString(16).slice(2)}.txt`)

  try {
    await fs.writeFile(a, before, 'utf8')
    await fs.writeFile(b, after, 'utf8')
    const res = spawnSync('git', ['diff', '--no-index', '--', a, b], { encoding: 'utf8' })
    const txt = `${res.stdout ?? ''}${res.stderr ?? ''}`.trim()
    if (!txt) return `diff -- ${relPath}`
    return txt
      .replaceAll(a, `a/${relPath}`)
      .replaceAll(b, `b/${relPath}`)
      .replace(/^diff --git.*$/m, `diff --git a/${relPath} b/${relPath}`)
  } finally {
    await fs.rm(a, { force: true }).catch(() => undefined)
    await fs.rm(b, { force: true }).catch(() => undefined)
  }
}
