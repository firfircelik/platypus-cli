import { Flags } from '@oclif/core'
import { BaseCommand } from '../base-command.js'
import { createChatSession } from '../../engine/chat-session.js'
import { createRepl } from '../../engine/repl.js'
import { loadProfile } from '../../core/profiles.js'
import { renderPlatypusBanner, shouldShowPlatypusBanner } from '../banner.js'

export default class Chat extends BaseCommand {
  static description = 'Interactive chat mode (Claude Code-style)'

  static flags = {
    provider: Flags.string({ char: 'p', default: 'openai', description: 'Provider id (e.g. openai)' }),
    model: Flags.string({ char: 'm', required: false, description: 'Model name (provider-specific)' }),
    autoApprove: Flags.boolean({ default: false, description: 'Auto-approve tool actions' }),
    root: Flags.string({ required: false, description: 'Project root path (defaults to cwd)' }),
    profile: Flags.string({ required: false, description: 'Profile name (e.g. plan, build)' })
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Chat)
    const root = flags.root ? flags.root : process.cwd()
    const profile = flags.profile ? loadProfile(flags.profile) : null
    const provider = (profile?.provider ?? flags.provider).trim().toLowerCase()

    if (shouldShowPlatypusBanner()) this.log(renderPlatypusBanner())
    this.log('Type /help for commands. Type /exit to quit.')

    let session: Awaited<ReturnType<typeof createChatSession>>
    try {
      session = await createChatSession({
        provider,
        model: profile?.model ?? flags.model,
        root,
        autoApprove: profile?.autoApprove ?? flags.autoApprove,
        mode: profile?.mode ?? 'build',
        allowedTools: profile?.allowedTools
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      this.log(`Failed to start chat: ${msg}`)
      this.log('')
      this.log('Common fixes:')
      this.log(`- Add your provider key: platypus keys add ${provider}`)
      this.log('- Validate it: platypus keys validate')
      this.log('- If file search is slow/empty, install ripgrep (rg) and re-run')
      return
    }

    const repl = createRepl('platypus> ', {
      onLine: async line => {
        if (line === '/exit' || line === '/quit') {
          repl.close()
          return
        }
        if (line === '/help') {
          repl.print(
            [
              '/help, /exit, /quit',
              '/mode <plan|build>',
              '/cd <path>',
              '/provider <openai|anthropic|google>',
              '/model <name>',
              '/ls [dir]',
              '/cat <file>',
              '/search <query> [dir]',
              '/diff',
              '/apply [ids]',
              '/discard [ids]',
              '/run <command>'
            ].join('\n')
          )
          return
        }
        if (line.startsWith('/mode ')) {
          const m = line.slice(6).trim().toLowerCase()
          if (m !== 'plan' && m !== 'build') {
            repl.print('Usage: /mode <plan|build>')
            return
          }
          await session.configure({ mode: m as any })
          repl.print(`OK (mode=${session.getConfig().mode})`)
          return
        }
        if (line.startsWith('/cd ')) {
          const nextRoot = line.slice(4).trim()
          if (!nextRoot) {
            repl.print('Usage: /cd <path>')
            return
          }
          await session.configure({ root: nextRoot })
          repl.print(`OK (root=${session.getConfig().root})`)
          return
        }
        if (line.startsWith('/provider ')) {
          const p = line.slice(10).trim().toLowerCase()
          if (!p) {
            repl.print('Usage: /provider <openai|anthropic|google>')
            return
          }
          await session.configure({ provider: p })
          repl.print(`OK (provider=${session.getConfig().provider})`)
          return
        }
        if (line.startsWith('/model ')) {
          const m = line.slice(7).trim()
          if (!m) {
            repl.print('Usage: /model <name>')
            return
          }
          await session.configure({ model: m })
          repl.print(`OK (model=${session.getConfig().model ?? ''})`)
          return
        }
        if (line === '/diff') {
          const staged = await session.runTool('show_writes', { summaryOnly: false })
          if (staged.trim().length > 0) {
            repl.print(staged)
            return
          }
          const out = await session.runTool('run_command', { command: 'git diff' })
          repl.print(out.trim().length > 0 ? out : '(no diff)')
          return
        }
        if (line === '/apply' || line.startsWith('/apply ')) {
          const rest = line.slice(6).trim()
          const ids =
            rest.length > 0
              ? rest
                  .split(',')
                  .map(s => Number(s.trim()))
                  .filter(n => Number.isFinite(n))
              : undefined
          const out = await session.runTool('apply_writes', { ids })
          repl.print(out)
          return
        }
        if (line === '/discard' || line.startsWith('/discard ')) {
          const rest = line.slice(8).trim()
          const ids =
            rest.length > 0
              ? rest
                  .split(',')
                  .map(s => Number(s.trim()))
                  .filter(n => Number.isFinite(n))
              : undefined
          const out = await session.runTool('discard_writes', { ids })
          repl.print(out)
          return
        }
        if (line.startsWith('/ls')) {
          const arg = line.slice(3).trim()
          const out = await session.runTool('list_files', { dir: arg.length > 0 ? arg : '.' })
          repl.print(out.trim().length > 0 ? out : '(empty)')
          return
        }
        if (line.startsWith('/cat ')) {
          const p = line.slice(5).trim()
          if (!p) {
            repl.print('Usage: /cat <file>')
            return
          }
          const out = await session.runTool('read_file', { path: p })
          repl.print(out)
          return
        }
        if (line.startsWith('/run ')) {
          const cmd = line.slice(5).trim()
          if (!cmd) {
            repl.print('Usage: /run <command>')
            return
          }
          const out = await session.runTool('run_command', { command: cmd })
          repl.print(out.trim().length > 0 ? out : 'OK')
          return
        }
        if (line.startsWith('/search ')) {
          const rest = line.slice(8).trim()
          if (!rest) {
            repl.print('Usage: /search <query> [dir]')
            return
          }
          const parts = rest.split(' ')
          const query = parts[0]
          const dir = parts.slice(1).join(' ').trim()
          const out = await session.runTool('search_files', { query, dir: dir.length > 0 ? dir : '.' })
          repl.print(out.trim().length > 0 ? out : '(no matches)')
          return
        }
        if (line.startsWith('/')) {
          repl.print('Unknown command. Type /help.')
          return
        }
        process.stdout.write('')
        const out = await session.handleUserMessageStream(line, delta => process.stdout.write(delta))
        if (out.trim().length > 0) process.stdout.write('\n')
      },
      onExit: async () => undefined
    })

    await repl.start()
  }
}
