# Platypus CLI API Reference

## Core Modules

### KeyStore
- Location: `src/crypto/key-store.ts`
- Responsibilities: encrypted storage of provider API keys (AES-256-GCM), master key stored in OS keychain (keytar) with file/env fallback.
- Key methods: `initialize()`, `storeKey()`, `getKey()`, `listKeys()`, `deleteKey()`, `validateKey()`, `rotateKey()`.

### TmuxManager
- Location: `src/screen/tmux-manager.ts`
- Responsibilities: create/list/attach/detach/kill tmux sessions; send/capture output; layout and pane splitting.

### AgentFactory
- Location: `src/agents/agent-factory.ts`
- Responsibilities: create agents with isolated tmux sessions; persist agent metadata; audit agent lifecycle events.

### Orchestrator
- Location: `src/orchestrator/orchestrator.ts`
- Responsibilities: role inference, task routing, agent messaging and broadcast.

### State DB
- Location: `src/state/state-db.ts`
- Responsibilities: SQLite-backed shared state for agents, locks, conflicts.

### FileLockManager
- Location: `src/state/file-lock-manager.ts`
- Responsibilities: pessimistic file locks with TTL to prevent concurrent writes.

### ConflictManager
- Location: `src/state/conflict-manager.ts`
- Responsibilities: record and resolve conflicts detected during file operations.

### Workspace
- Location: `src/core/workspace.ts`
- Responsibilities: safe file read/write with path traversal protection, locking, audit logging, conflict recording.

## CLI Commands

Command implementations are under `src/cli/commands/**` and use Oclif.
