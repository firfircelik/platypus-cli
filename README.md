# Platypus CLI

> 🐥 Multi-agent coding assistant CLI for autonomous software development teams

Platypus is an open-source, provider-agnostic coding agent CLI inspired by tools like Claude Code and OpenCode. Spawn AI agents, orchestrate multi-agent workflows, and automate your development process with full control over your LLM providers.

## Installation

### Quick install (YOLO)

```bash
curl -fsSL https://raw.githubusercontent.com/firfircelik/platypus-cli/main/install.sh | bash
```

### Package managers

```bash
# npm
npm i -g platypus-cli@latest        # or bun/pnpm/yarn

# Homebrew (macOS & Linux)
brew install firfircelik/tap/platypus  # recommended, always up to date
brew install platypus                      # official brew formula, updated less

# Scoop (Windows)
scoop bucket add extras
scoop install platypus

# Chocolatey (Windows)
choco install platypus

# Arch Linux
paru -S platypus-bin

# mise (any OS)
mise use -g platypus

# nix
nix run nixpkgs#platypus
```

### Desktop app

```bash
# macOS (Homebrew)
brew install --cask platypus-desktop

# Windows (Scoop)
scoop bucket add extras
scoop install extras/platypus-desktop
```

### Install script behavior

The install script respects the following priority order for the install path:

1. `PLATYPUS_INSTALL_DIR`
2. `XDG_BIN_DIR`
3. `$HOME/bin`
4. `$HOME/.platypus/bin`

## Quick start

```bash
# Interactive chat mode (default)
platypus

# Or use the chat command explicitly
platypus chat

# Single task execution
platypus run "Add login page UI and write unit tests" --wait 120

# Spawn multi-agent team
platypus agent spawn-team --prefix myproj --agents frontend,backend,qa
```

## Features

- **🤖 Multi-Agent Orchestration** - Spawn teams of specialized AI agents with role-based routing
- **🔌 Provider Agnostic** - Support for OpenAI, Anthropic, Google Gemini, and more
- **🛡️ Enterprise Security** - AES-256-GCM encrypted key storage with OS keychain integration
- **🔧 11 Built-in Tools** - Read, write, search, patch, list, and run commands safely
- **📦 Staged Workflow** - Review changes before applying with diff visualization
- **🎭 Multiple Profiles** - Plan mode (read-only) and build mode (full access)
- **🔄 Pre-built Workflows** - Code review, dev stories, quick specs, and more
- **🖥️ TMUX Integration** - Run agents in parallel terminal sessions
- **📊 State Persistence** - SQLite-backed storage for agents, tasks, and workflows
- **🎨 Customizable** - Extensible with custom agents, tools, and workflows

## Usage examples

### Interactive chat

```bash
platypus

# In chat REPL:
> /mode build
> /cd ~/projects/myapp
> /provider openai
> /model gpt-4o
> Add unit tests for auth module
> /diff
> /apply 1,2
```

### Multi-agent development

```bash
# Spawn a team with frontend, backend, and QA agents
platypus agent spawn-team --prefix myapp \
  --agents frontend-dev,backend-dev,qa \
  --model gpt-4o

# List all agents
platypus agent list

# Start an agent
platypus agent start <agent-id>

# Stop an agent
platypus agent stop <agent-id>
```

### Workflows

```bash
# Automated code review
platypus workflow code-review --branch feature/auth

# Generate development story
platypus workflow dev-story --feature "User authentication"

# Quick specification
platypus workflow quick-spec --prompt "REST API for user management"
```

## Configuration

### API keys

Add your LLM provider API keys:

```bash
# Add keys
platypus keys add openai
platypus keys add anthropic
platypus keys add google

# List all keys
platypus keys list

# Validate keys
platypus keys validate

# Remove a key
platypus keys remove openai
```

Keys are encrypted with AES-256-GCM and stored securely in your OS keychain (via keytar).

### Profiles

Create custom profiles for different use cases:

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

Then use with: `platypus chat --profile review`

### Environment variables

| Variable                | Description                                |
| ----------------------- | ------------------------------------------ |
| `PLATYPUS_BANNER`       | Set to `0` to disable startup banner       |
| `NO_COLOR`              | Set to `1` to disable colors               |
| `PLATYPUS_MASTER_KEY`   | Master encryption key (32 bytes hex)       |
| `OPENAI_API_KEY`        | OpenAI API key                             |
| `ANTHROPIC_API_KEY`     | Anthropic API key                          |
| `GOOGLE_API_KEY`        | Google API key                             |
| `PLATYPUS_MODEL`        | Default model name                         |
| `PLATYPUS_PROVIDER`     | Default provider (openai/anthropic/google) |
| `PLATYPUS_MODE`         | Default mode (plan/build)                  |
| `PLATYPUS_AUTO_APPROVE` | Set to `1` to auto-approve tool actions    |

## Development

```bash
# Clone and setup
git clone https://github.com/firfircelik/platypus-cli.git
cd platypus-cli
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm test

# Test coverage
npm run test:coverage

# Lint and format
npm run lint
npm run format
```

## Architecture

Platypus is built with TypeScript and follows a clean layered architecture:

- **CLI Layer** - oclif framework with command routing
- **Engine Layer** - Chat session, REPL, and tool orchestration
- **LLM Layer** - Multi-provider support with tool calling
- **State Layer** - SQLite persistence and Redis message bus
- **Agent Layer** - Multi-agent runtime and orchestration
- **Security Layer** - Encrypted key storage and management

## Documentation

- [User Guide](./docs/user-guide.md) - Comprehensive usage documentation
- [API Reference](./docs/api-reference.md) - Extensibility and plugin development
- [Package Distribution](./packages/README.md) - Package manager installation guides
- [Examples](./docs/examples/) - Sample workflows and configurations

## Project status

| Component                 | Status                       |
| ------------------------- | ---------------------------- |
| Core CLI                  | ✅ Stable                    |
| Multi-agent orchestration | ✅ Stable                    |
| LLM providers             | ✅ OpenAI, Anthropic, Google |
| Tool orchestration        | ✅ 11 tools                  |
| State persistence         | ✅ SQLite + Redis            |
| Security                  | ✅ AES-256-GCM               |
| TMUX integration          | ✅ Full support              |
| Workflows                 | ✅ 4 built-in                |
| Test coverage             | ✅ 91%+                      |

## Contributing

Contributions welcome! Please read our contributing guidelines and submit pull requests.

## License

MIT

---

**Made with ❤️ by the Platypus team**
