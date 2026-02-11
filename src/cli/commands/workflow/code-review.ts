import { Args, Flags } from '@oclif/core'
import { BaseCommand } from '../../base-command.js'
import { createChatSession } from '../../../engine/chat-session.js'
import { WorkflowStore } from '../../../state/workflow-store.js'
import { loadProfile } from '../../../core/profiles.js'

export default class CodeReview extends BaseCommand {
  static description = 'Review current changes and suggest fixes (BMAD-style)'

  static args = {
    focus: Args.string({ required: false, description: 'Optional focus area (e.g. security, tests)' })
  }

  static flags = {
    runId: Flags.string({ required: false, description: 'Existing workflow run id' }),
    provider: Flags.string({ char: 'p', default: 'openai', description: 'Provider id (e.g. openai)' }),
    model: Flags.string({ char: 'm', required: false, description: 'Model name (provider-specific)' }),
    root: Flags.string({ required: false, description: 'Project root path (defaults to cwd)' }),
    profile: Flags.string({ required: false, description: 'Profile name (e.g. plan, build)' })
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(CodeReview)
    const root = flags.root ? flags.root : process.cwd()
    const profile = flags.profile ? loadProfile(flags.profile) : null
    const provider = (profile?.provider ?? flags.provider).trim().toLowerCase()

    const store = new WorkflowStore()
    const existing = flags.runId ? store.getRun(flags.runId) : null
    const run = existing ?? store.createRun('code-review', root)
    store.setRunStatus(run.id, 'running')

    const focus = args.focus ? args.focus : 'general quality'
    const step = store.addStep(run.id, 'code-review', focus)
    store.setStepStatus(step.id, 'running')

    try {
      const session = await createChatSession({
        provider,
        model: profile?.model ?? flags.model,
        root,
        autoApprove: profile?.autoApprove ?? false,
        mode: profile?.mode ?? 'plan',
        allowedTools: profile?.allowedTools
      })
      const staged = await session.runTool('show_writes', {})
      const diff = staged.trim().length > 0 ? staged : await session.runTool('run_command', { command: 'git diff' })
      const prompt = [
        'Perform a code review on the following diff.',
        `Focus: ${focus}`,
        'Return:',
        '- High-risk issues',
        '- Suggested fixes',
        '- Missing tests/checks',
        '- A short merge readiness verdict',
        '',
        diff.trim().length > 0 ? diff : '(no diff)'
      ].join('\n')
      const out = await session.handleUserMessageStream(prompt, delta => process.stdout.write(delta))
      if (out.trim().length > 0) process.stdout.write('\n')
      store.setStepStatus(step.id, 'done', out)
      store.setRunStatus(run.id, 'done')
      this.log(`Run id: ${run.id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      store.setStepStatus(step.id, 'failed', message)
      store.setRunStatus(run.id, 'failed')
      throw error
    }
  }
}
