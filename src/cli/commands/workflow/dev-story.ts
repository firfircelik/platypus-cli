import { Args, Flags } from '@oclif/core'
import { BaseCommand } from '../../base-command.js'
import { createChatSession } from '../../../engine/chat-session.js'
import { WorkflowStore } from '../../../state/workflow-store.js'
import { loadProfile } from '../../../core/profiles.js'

export default class DevStory extends BaseCommand {
  static description = 'Implement a single story (BMAD-style)'

  static args = {
    story: Args.string({ required: true, description: 'Story text or story id' })
  }

  static flags = {
    runId: Flags.string({ required: false, description: 'Existing workflow run id' }),
    provider: Flags.string({ char: 'p', default: 'openai', description: 'Provider id (e.g. openai)' }),
    model: Flags.string({ char: 'm', required: false, description: 'Model name (provider-specific)' }),
    root: Flags.string({ required: false, description: 'Project root path (defaults to cwd)' }),
    autoApprove: Flags.boolean({ default: false, description: 'Auto-approve tool actions' }),
    profile: Flags.string({ required: false, description: 'Profile name (e.g. plan, build)' })
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(DevStory)
    const root = flags.root ? flags.root : process.cwd()
    const profile = flags.profile ? loadProfile(flags.profile) : null
    const provider = (profile?.provider ?? flags.provider).trim().toLowerCase()

    const store = new WorkflowStore()
    const existing = flags.runId ? store.getRun(flags.runId) : null
    const run = existing ?? store.createRun('dev-story', root)
    store.setRunStatus(run.id, 'running')

    const prompt = [
      'Implement the following story in the current project.',
      'Requirements:',
      '- Prefer small, safe changes and use tools to inspect existing code.',
      '- Stage changes via write_file/patch_file, then summarize what changed.',
      '- Do not assume dependencies; verify by reading existing files.',
      '',
      `Story: ${args.story}`
    ].join('\n')

    const step = store.addStep(run.id, 'dev-story', args.story)
    store.setStepStatus(step.id, 'running')

    try {
      const session = await createChatSession({
        provider,
        model: profile?.model ?? flags.model,
        root,
        autoApprove: profile?.autoApprove ?? flags.autoApprove,
        mode: profile?.mode ?? 'build',
        allowedTools: profile?.allowedTools
      })
      const out = await session.handleUserMessageStream(prompt, delta => process.stdout.write(delta))
      if (out.trim().length > 0) process.stdout.write('\n')
      const staged = await session.runTool('show_writes', {})
      if (staged.trim().length > 0) {
        this.log('\nStaged changes:\n')
        this.log(staged)
        this.log('\nApply with: platypus chat → /apply (or use your git workflow)\n')
      }
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
