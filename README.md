# Platypus

```
      .--..-'''-''''-._
  ___/%   ) )      \ i-;;,_
 ((:___/--/ /--------\ ) `'-' 
          ""          ""
```

[![CI](https://github.com/firfircelik/platypus-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/firfircelik/platypus-cli/actions/workflows/ci.yml)
[![Go Version](https://img.shields.io/badge/Go-1.25+-00ADD8?logo=go)](https://go.dev/dl/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/firfircelik/platypus-cli?logo=github)](https://github.com/firfircelik/platypus-cli/releases)

**AI coding agent — get work done, not just conversation.**

Minimal tokens, maximum accuracy. Built with Go for speed, concurrency, and simplicity.

## Features

- **Multi-provider** — Anthropic (Claude), OpenAI (GPT), Ollama (local)
- **Parallel tool execution** — All tools run concurrently
- **Provider fallback** — Auto-switches to next provider on failure
- **Smart context** — Token pruning, deduplication, compaction
- **TUI** — Full-screen terminal interface via Bubbletea
- **LSP** — VS Code extension support
- **Internationalization** — EN, TR, DE, IT, ES
- **Plan mode** — Read-only analysis before making changes

## Installation

### Homebrew (macOS / Linux)

```bash
brew tap firfircelik/tap
brew install platypus
```

### Scoop (Windows)

```bash
scoop bucket add platypus https://github.com/firfircelik/scoop-bucket
scoop install platypus
```

### From source

```bash
go install github.com/firfircelik/platypus-cli/cmd/platypus@latest
```

### Build locally

```bash
git clone https://github.com/firfircelik/platypus-cli.git
cd platypus-cli
make build
```

### From releases

Download pre-built binaries from [Releases](https://github.com/firfircelik/platypus-cli/releases).

## Setup

```bash
# Anthropic
export ANTHROPIC_API_KEY=sk-ant-...

# or OpenAI
export OPENAI_API_KEY=sk-...
```

## Usage

```bash
# Single command (silent mode)
platypus "refactor main.go to use interfaces"

# Verbose mode
platypus -v "refactor main.go"

# With OpenAI
platypus -p openai -m gpt-4o "fix bug in handler.go"

# Interactive REPL
platypus -i

# Full TUI mode
platypus -t

# LSP server (for VS Code)
platypus --lsp

# Set language
platypus --lang tr "dosyayı düzenle"
```

### TUI Controls

| Key | Action |
|-----|--------|
| `Ctrl+D` | Send message |
| `Esc` | Quit |

## Configuration

`platypus.toml`:

```toml
[providers.default]
provider = "anthropic"
model = "claude-sonnet-4-6"

[security]
mode = "permissive"

[bash]
allow_all = true

[i18n]
language = "en"  # en | tr | de | it | es

[ui]
verbose = false
```

Config file locations: `./platypus.toml` or `~/.platypus/platypus.toml`

## Tools

| Tool | Description |
|------|-------------|
| `Bash` | Execute shell commands |
| `Read` | Read files |
| `Write` | Write files |
| `Edit` | Edit files (search/replace) |
| `Grep` | Regex search across files |
| `Glob` | Find files by glob pattern |
| `WebFetch` | Fetch URL content |
| `WebSearch` | Web search |
| `TodoWrite` | Manage todo lists |
| `Tree` | Show directory tree |
| `Git` | Git operations |
| `Diff` | Show diffs |
| `Branch` | Branch management |
| `Memory` | Persistent memory |
| `Cron` | Scheduled tasks |
| `SubAgent` | Spawn sub-agents |

## Development

```bash
make build    # Build binary
make test     # Run tests
make lint     # Run linter
make run      # Run in TUI mode
make fmt      # Format code
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
