import { Command } from '@oclif/core'
import { KeyStore } from '../crypto/key-store.js'
import { AgentFactory } from '../agents/agent-factory.js'
import { AgentStore } from '../state/agent-store.js'
import { TmuxManager } from '../screen/tmux-manager.js'
import { Orchestrator } from '../orchestrator/orchestrator.js'
import { AuditLogger } from '../core/audit.js'

export abstract class BaseCommand extends Command {
  protected async getKeyStore(): Promise<KeyStore> {
    const store = new KeyStore()
    await store.initialize()
    return store
  }

  protected getAgentFactory(): AgentFactory {
    return new AgentFactory({ maxAgents: 25 })
  }

  protected getAgentStore(): AgentStore {
    return new AgentStore()
  }

  protected getTmuxManager(): TmuxManager {
    return new TmuxManager()
  }

  protected getOrchestrator(): Orchestrator {
    return new Orchestrator()
  }

  protected getAudit(): AuditLogger {
    return new AuditLogger()
  }
}

