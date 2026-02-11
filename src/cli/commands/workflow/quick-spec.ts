import { Flags } from '@oclif/core'
import { BaseCommand } from '../../base-command.js'
import { createChatSession } from '../../../engine/chat-session.js'
import { WorkflowStore } from '../../../state/workflow-store.js'
import { loadProfile } from '../../../core/profiles.js'

export default class QuickSpec extends BaseCommand {
  static description = 'Generate a BMAD-style quick spec for the current project'

  static flags = {
    provider: Flags.string({ char: 'p', default: 'openai', description: 'Provider id (e.g. openai)' }),
    model: Flags.string({ char: 'm', required: false, description: 'Model name (provider-specific)' }),
    root: Flags.string({ required: false, description: 'Project root path (defaults to cwd)' }),
    profile: Flags.string({ required: false, description: 'Profile name (e.g. plan, build)' })
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(QuickSpec)
    const root = flags.root ? flags.root : process.cwd()
    const profile = flags.profile ? loadProfile(flags.profile) : null
    const provider = (profile?.provider ?? flags.provider).trim().toLowerCase()

    const store = new WorkflowStore()
    const run = store.createRun('quick-spec', root)
    store.setRunStatus(run.id, 'running')

    const prompt =
      'Analyze the project at the configured root. Produce a concise technical spec with: scope, assumptions, architecture overview, risks, and a numbered list of user stories with acceptance criteria. Keep it actionable.'

    const step = store.addStep(run.id, 'quick-spec', prompt)
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
