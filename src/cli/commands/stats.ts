import { BaseCommand } from '../base-command.js'

export default class Stats extends BaseCommand {
  static description = 'Show basic performance and resource statistics'

  async run(): Promise<void> {
    const agents = this.getAgentStore().list()
    const mem = process.memoryUsage()
    const cpu = process.cpuUsage()

    const running = agents.filter(a => a.state === 'running').length
    const idle = agents.filter(a => a.state === 'idle').length

    this.log(`agents.total\t${agents.length}`)
    this.log(`agents.running\t${running}`)
    this.log(`agents.idle\t${idle}`)
    this.log(`process.rss\t${mem.rss}`)
    this.log(`process.heapUsed\t${mem.heapUsed}`)
    this.log(`process.cpuUser\t${cpu.user}`)
    this.log(`process.cpuSystem\t${cpu.system}`)
  }
}

