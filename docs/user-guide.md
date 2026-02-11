# Platypus CLI User Guide

## Installation

One-line installer (like opencode):

```bash
curl -fsSL https://raw.githubusercontent.com/firfircelik/<repo>/main/install.sh | bash
```

Install script respects (highest priority first):

- `PLATYPUS_INSTALL_DIR` (custom bin dir)
- `XDG_BIN_DIR`
- `$HOME/bin`
- `$HOME/.platypus/bin`

Package manager install:

```bash
npm install -g platypus-cli
```

## Quick Start

Create a 5-agent team and attach to a session:

```bash
platypus agent spawn-team --prefix myproj
platypus agent list
platypus screen attach --session myproj-frontend
```

Run a natural language task and broadcast it to the best-fit agents:

```bash
platypus run "Add login page UI and write unit tests"
```

## API Keys (Encrypted)

Add a provider key (stored encrypted at rest, master key in OS keychain):

```bash
platypus keys add --provider openai
```

List keys (never prints secrets):

```bash
platypus keys list
```

Validate a stored key:

```bash
platypus keys validate --provider openai
```

## Agent Management

Create an agent:

```bash
platypus agent create --name api --role backend-dev --capabilities api --capabilities db
```

Start/stop:

```bash
platypus agent start --id <agent-id>
platypus agent stop --id <agent-id>
```

Destroy:

```bash
platypus agent destroy --id <agent-id>
```

## Screen Management (tmux)

List sessions:

```bash
platypus screen list
```

Attach:

```bash
platypus screen attach --session <session-name>
```

Change layout:

```bash
platypus screen layout --session <session-name> --layout collaborative
```

Split panes:

```bash
platypus screen split --session <session-name> --direction vertical
```

## Conflicts

List detected conflicts:

```bash
platypus conflict list
```

Resolve:

```bash
platypus conflict resolve --id <conflict-id> --by <agent-id> --type manual
```

## Stats

```bash
platypus stats
```
