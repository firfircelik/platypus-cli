# Contributing to Platypus CLI

Thanks for your interest in contributing to Platypus CLI! This document covers everything you need to get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Testing](#testing)
- [Commit Messages](#commit-messages)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Code of Conduct

Be respectful. We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). Harassment, discrimination, and bad-faith behavior won't be tolerated.

## Getting Started

1. **Fork** the repo on GitHub
2. **Clone** your fork locally
3. **Create a branch** from `main` for your changes
4. **Make your changes** with tests
5. **Submit a pull request** back to `main`

## Development Setup

### Prerequisites

- **Node.js 20+** (check with `node --version`)
- **npm** (comes with Node.js)
- **Git**

### Setup

```bash
git clone https://github.com/<your-username>/platypus-cli.git
cd platypus-cli
npm install
npm run build
```

### Verify everything works

```bash
npm test               # 219 tests should pass
npm run build          # TypeScript compilation + oclif manifest
npm run lint           # ESLint checks
```

### Running locally

```bash
# Run the CLI directly from source
node bin/platypus.js

# Or link it globally for development
npm link
platypus
```

## Making Changes

### Branch naming

Use descriptive branch names:

- `fix/repl-close-on-eof` — bug fix
- `feat/azure-provider` — new feature
- `docs/update-api-reference` — documentation
- `refactor/tool-registry` — refactoring
- `test/chat-session-coverage` — test improvements

### Project structure

```
src/
├── cli/              # oclif commands, REPL, banner
│   ├── commands/     # CLI commands organized by topic
│   └── base-command.ts
├── engine/           # Chat session, REPL engine, tool orchestration
├── llm/              # LLM provider clients (OpenAI, Anthropic, Google)
├── crypto/           # AES-256-GCM key store
├── state/            # SQLite persistence, agent store, workflow store
├── screen/           # TMUX session management
└── types/            # Shared TypeScript types
tests/                # Test files (mirror src/ structure)
```

### Key files

| File                          | Purpose                              |
| ----------------------------- | ------------------------------------ |
| `src/cli/commands/chat.ts`    | Main chat command (REPL entry point) |
| `src/engine/repl.ts`          | Interactive REPL engine              |
| `src/engine/chat-session.ts`  | LLM conversation management          |
| `src/engine/tooling.ts`       | All 15 built-in tools                |
| `src/llm/openai-client.ts`    | OpenAI provider                      |
| `src/llm/anthropic-client.ts` | Anthropic provider                   |
| `src/llm/google-client.ts`    | Google Gemini provider               |
| `src/crypto/key-store.ts`     | Encrypted key storage                |

## Pull Request Process

1. **Update tests** — all new code needs tests. All existing tests must still pass.
2. **Run the full check** before submitting:
   ```bash
   npm run lint && npm test && npm run build
   ```
3. **Write a clear PR description** — explain what you changed and why.
4. **Keep PRs focused** — one logical change per PR. Large refactors should be split.
5. **Respond to review feedback** — maintainers may request changes.

### PR checklist

- [ ] Branch is up to date with `main`
- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Lint passes (`npm run lint`)
- [ ] New code has tests
- [ ] PR description explains the change

## Code Style

We use **ESLint** and **Prettier** for consistent code formatting. The project uses:

- TypeScript strict mode
- ES2022 target with ESNext modules
- 2-space indentation
- Double quotes
- Semicolons

### Auto-format on commit

The project uses **husky** + **lint-staged** to automatically lint and format staged `.ts` files on commit.

### Manual formatting

```bash
npm run lint           # Check for issues
npm run format         # Auto-fix formatting
```

## Testing

We use [Vitest](https://vitest.dev/) for testing.

```bash
npm test               # Run all tests
npm run test:watch     # Watch mode (re-runs on file changes)
npm run test:coverage  # Run with coverage report
```

### Coverage thresholds

The project enforces minimum coverage:

| Metric     | Threshold |
| ---------- | --------- |
| Lines      | 91%       |
| Statements | 91%       |
| Functions  | 92%       |
| Branches   | 70%       |

### Writing tests

- Place test files in `tests/` mirroring the `src/` structure
- Name test files `<module>.test.ts`
- Use `describe` / `it` blocks with clear descriptions
- Mock external dependencies (LLM APIs, filesystem, SQLite)

Example:

```typescript
import { describe, it, expect, vi } from "vitest";
import { ChatSession } from "../src/engine/chat-session.js";

describe("ChatSession", () => {
  it("should initialize with default provider", () => {
    const session = new ChatSession({ provider: "openai" });
    expect(session.provider).toBe("openai");
  });
});
```

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

### Types

| Type       | When to use                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | New feature                                             |
| `fix`      | Bug fix                                                 |
| `docs`     | Documentation only                                      |
| `style`    | Formatting, no logic change                             |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test`     | Adding or updating tests                                |
| `chore`    | Build process, tooling, dependencies                    |
| `perf`     | Performance improvement                                 |

### Examples

```
feat(llm): add Azure OpenAI provider support
fix(repl): prevent exit on empty input
docs: update API reference for tool registration
test(crypto): add key rotation coverage
chore(ci): add Node 22 to test matrix
```

## Reporting Bugs

[Open an issue](https://github.com/firfircelik/platypus-cli/issues/new) with:

- **Platypus version** (`platypus --version`)
- **Node.js version** (`node --version`)
- **Operating system**
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Error output / stack trace** (if applicable)

## Suggesting Features

[Open an issue](https://github.com/firfircelik/platypus-cli/issues/new) with:

- **Use case** — what problem does this solve?
- **Proposed solution** — how should it work?
- **Alternatives considered** — what other approaches did you think about?

---

Thank you for contributing!
