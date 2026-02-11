import { BaseCommand } from '../../base-command.js'
import { WorkflowStore } from '../../../state/workflow-store.js'

export default class BmadHelp extends BaseCommand {
  static description = 'Suggest the next recommended workflow step (BMAD-style)'

  async run(): Promise<void> {
    const store = new WorkflowStore()
    const run = store.latestRun()
    if (!run) {
      this.log(
        [
          'No workflow runs found.',
          'Next: platypus workflow quick-spec',
          '',
          'Then: platypus workflow dev-story <story>',
          'Then: platypus workflow code-review'
        ].join('\n')
      )
      return
    }

    if (run.status !== 'done') {
      this.log([`Latest run: ${run.id} (${run.name}) status=${run.status}`, 'Finish or re-run the current step first.'].join('\n'))
      return
    }

    if (run.name === 'quick-spec') {
      this.log(
        [
          'Next: pick a story and run:',
          `  platypus workflow dev-story \"<story>\" --runId ${run.id}`,
          'Then: platypus workflow code-review --runId <runId>'
        ].join('\n')
      )
      return
    }

    if (run.name === 'dev-story') {
      this.log(['Next: review changes:', `  platypus workflow code-review --runId ${run.id}`, 'Optional: run tests: npm test'].join('\n'))
      return
    }

    this.log(['Suggested next steps:', '  platypus workflow quick-spec', '  platypus workflow dev-story \"<story>\"', '  platypus workflow code-review'].join('\n'))
  }
}
