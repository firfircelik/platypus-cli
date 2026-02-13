<p align="center">
  <pre align="center">
        ___,,___
     ,-='    '=-.
   ,'   _  _    '.
  /    (o)(o)     \
 ;     _       _   ;
 |    (_)--.--(_)  |
 ;     '.    .'    ;
  \      '--'     /
   '.           .'
     '-._____.-'
   ~~/         \~~
  ~~(           )~~
    ~~\_______/~~
  </pre>
</p>

<h1 align="center">Platypus CLI</h1>

<p align="center">
  <strong>Multi-agent coding assistant for autonomous software development teams</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/platypus-cli"><img src="https://img.shields.io/npm/v/platypus-cli.svg?style=flat-square&color=blue" alt="npm version"></a>
  <a href="https://github.com/firfircelik/platypus-cli/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/firfircelik/platypus-cli/ci.yml?style=flat-square&label=CI" alt="CI"></a>
  <a href="https://github.com/firfircelik/platypus-cli/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/platypus-cli.svg?style=flat-square" alt="license"></a>
  <a href="https://www.npmjs.com/package/platypus-cli"><img src="https://img.shields.io/npm/dm/platypus-cli.svg?style=flat-square" alt="downloads"></a>
  <a href="https://nodejs.org/en/"><img src="https://img.shields.io/node/v/platypus-cli.svg?style=flat-square" alt="node version"></a>
</p>

<p align="center">
  <a href="#installation">Install</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#features">Features</a> •
  <a href="#commands">Commands</a> •
  <a href="./docs/user-guide.md">Docs</a> •
  <a href="./CONTRIBUTING.md">Contributing</a>
</p>

---

Platypus is an open-source, provider-agnostic coding agent CLI. Spawn AI agents, orchestrate multi-agent workflows, and automate your development process — all from your terminal. Think Claude Code or Cursor, but fully open and under your control.

## Installation

```bash
npm install -g platypus-cli
```

> Also works with `pnpm`, `yarn`, or `bun` — any npm-compatible package manager.

Requires **Node.js 20+**.

## Quick Start

```bash
# 1. Add an API key
platypus keys add openai       # or: anthropic, google

# 2. Start chatting
platypus
```

That's it. Platypus opens an interactive REPL where you can talk to your chosen LLM, run tools, and apply changes to your codebase.

```bash
# Single-shot task execution
platypus run "Add input validation to the signup form" --wait 120

# Check system health
platypus doctor
```

## Features

|                               |                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| **Multi-Agent Orchestration** | Spawn teams of specialized AI agents with role-based routing and parallel execution via TMUX |
| **Provider Agnostic**         | OpenAI, Anthropic, and Google Gemini — switch with a single flag                             |
| **Encrypted Key Storage**     | AES-256-GCM encryption with OS keychain integration (keytar)                                 |
| **15 Built-in Tools**         | Read, write, patch, search, list files, run commands, JSON ops, MCP bridge, LSP requests     |
| **Staged Changes**            | Review diffs before applying — nothing hits disk until you approve                           |
| **Plan & Build Modes**        | Read-only "plan" mode for analysis, full-access "build" mode for changes                     |
| **Workflows**                 | Pre-built workflows for code review, dev stories, and quick specs                            |
| **TMUX Integration**          | Run agents in parallel terminal sessions with split panes and layouts                        |
| **State Persistence**         | SQLite-backed storage for agents, tasks, and workflow state                                  |
| **Redis Message Bus**         | Optional inter-agent communication via Redis pub/sub                                         |

## Commands

### Core

| Command                 | Description                             |
| ----------------------- | --------------------------------------- |
| `platypus`              | Interactive chat REPL (default)         |
| `platypus chat`         | Explicit chat mode with flags           |
| `platypus run "<task>"` | Execute a single task non-interactively |
| `platypus doctor`       | Check system health and dependencies    |
| `platypus stats`        | Show usage statistics                   |
| `platypus upgrade`      | Upgrade to the latest version           |

### Agent Management

```bash
platypus agent spawn-team --prefix myapp --agents frontend,backend,qa
platypus agent list
platypus agent create --name reviewer --role qa
platypus agent start <id>
platypus agent stop <id>
platypus agent destroy <id>
```

### Key Management

```bash
platypus keys add <provider>        # openai | anthropic | google
platypus keys list
platypus keys validate
platypus keys remove <provider>
```

### Workflows

```bash
platypus workflow code-review --branch feature/auth
platypus workflow dev-story --feature "User authentication"
platypus workflow quick-spec --prompt "REST API for user management"
```

### Screen / TMUX

```bash
platypus screen list
platypus screen attach <session>
platypus screen split --layout tiled
platypus screen layout <name>
```

### REPL Commands

Inside the interactive chat, these slash commands are available:

| Command               | Description                        |
| --------------------- | ---------------------------------- |
| `/mode <plan\|build>` | Switch between plan and build mode |
| `/provider <name>`    | Switch LLM provider                |
| `/model <name>`       | Switch model                       |
| `/cd <path>`          | Change working directory           |
| `/diff`               | Show pending staged changes        |
| `/apply [indices]`    | Apply staged changes to disk       |
| `/discard [indices]`  | Discard staged changes             |
| `/clear`              | Clear conversation history         |
| `/exit`               | Exit the REPL                      |

## Configuration

### API Keys

Keys are encrypted with **AES-256-GCM** and stored securely in your OS keychain via keytar, with a SQLite fallback.

```bash
platypus keys add openai
platypus keys add anthropic
platypus keys add google
```

### Profiles

Create custom profiles for different workflows:

```yaml
# ~/.platypus/config/profiles/review.yaml
name: review
mode: plan
provider: anthropic
model: claude-3-5-sonnet-20241022
autoApprove: false
allowedTools:
  - read_file
  - list_files
  - search_files
  - run_command
```

```bash
platypus chat --profile review
```

### Environment Variables

| Variable                | Description                                          |
| ----------------------- | ---------------------------------------------------- |
| `PLATYPUS_BANNER`       | `0` to disable startup banner                        |
| `NO_COLOR`              | `1` to disable colors                                |
| `PLATYPUS_MASTER_KEY`   | Master encryption key (32 bytes hex)                 |
| `OPENAI_API_KEY`        | OpenAI API key (alternative to `keys add`)           |
| `ANTHROPIC_API_KEY`     | Anthropic API key                                    |
| `GOOGLE_API_KEY`        | Google API key                                       |
| `PLATYPUS_MODEL`        | Default model name                                   |
| `PLATYPUS_PROVIDER`     | Default provider (`openai` / `anthropic` / `google`) |
| `PLATYPUS_MODE`         | Default mode (`plan` / `build`)                      |
| `PLATYPUS_AUTO_APPROVE` | `1` to auto-approve tool actions                     |

## Architecture

```
┌─────────────────────────────────────────────┐
│                  CLI Layer                   │
│         oclif commands + REPL engine         │
├─────────────────────────────────────────────┤
│                Engine Layer                  │
│    Chat session · Tool orchestration · MCP   │
├──────────────┬──────────────┬───────────────┤
│   LLM Layer  │  State Layer │  Agent Layer  │
│  OpenAI      │  SQLite DB   │  Multi-agent  │
│  Anthropic   │  Redis bus   │  runtime &    │
│  Google      │  Workflows   │  TMUX manager │
├──────────────┴──────────────┴───────────────┤
│              Security Layer                  │
│    AES-256-GCM · OS Keychain · Key store    │
└─────────────────────────────────────────────┘
```

## Development

```bash
git clone https://github.com/firfircelik/platypus-cli.git
cd platypus-cli
npm install

npm run build          # Compile TypeScript + generate oclif manifest
npm run dev            # Watch mode
npm test               # Run all tests (vitest)
npm run test:coverage  # With coverage report
npm run lint           # ESLint
npm run format         # Prettier
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on submitting changes.

## Documentation

- **[User Guide](./docs/user-guide.md)** — Comprehensive usage documentation
- **[API Reference](./docs/api-reference.md)** — Extensibility and plugin development
- **[Examples](./docs/examples/)** — Sample workflows and configurations

## License

[MIT](./LICENSE)

---

<p align="center">
  <sub>Built by <a href="https://github.com/firfircelik">@firfircelik</a></sub>
</p>
