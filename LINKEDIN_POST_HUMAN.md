# LinkedIn Post: Platypus CLI v1.1.1 — The Real One

## Copy & Paste This (Human Version):

---

**Challenge accepted:** Can I build something like Claude Code, but open-source and multi-agent?

Three months later: Platypus CLI v1.1.1 is alive.

**Why "Platypus"?**

The platypus is nature's weird hybrid — part mammal, part bird, part reptile. It looks like someone stitched together random parts and somehow it works. That's exactly what this project is: part LLM client, part multi-agent orchestrator, part terminal tool. A weird mashup that actually functions.

Also platypuses are solo hunters but can work in groups when needed. Felt fitting for a multi-agent CLI.

**Why open source?**

Because I don't want one company controlling how we code. Claude Code is slick but it's a black box. I wanted something I can actually debug, extend, and run offline. So I built it and put it out there for anyone to break.

**What's new in v1.1.1:**

- **Actually good system prompts** (not "you are a coding assistant")
- **Smart command safety** — blocks dangerous stuff without hand-holding you on every command
- **Streaming for all 3 providers** (OpenAI, Anthropic, Google)
- **50 tool calls** instead of giving up at 8
- **244 tests**, CI green, works offline

It's not perfect. Docs are sparse, edge cases exist, and the multi-agent stuff is overkill for simple tasks. But for complex work where you need multiple agents? It delivers.

```bash
npm install -g platypus-cli
```

Repo: https://github.com/firfircelik/platypus-cli

Built it for the challenge. Keeping it open for everyone. PRs welcome.

---

## Hashtags:

#opensource #cli #ai #typescript #developer #coding #github

## Why This Works:

- **"Challenge accepted"** — Clear motivation
- **Platypus metaphor** — Memorable and accurate
- **"Someone stitched together random parts"** — Honest about the architecture
- **"Solo hunters but can work in groups"** — Clever multi-agent reference
- **"Put it out there for anyone to break"** — Open source ethos
- **"Docs are sparse"** — Admits flaws, builds trust
- **"Built it for the challenge"** — Authentic motivation
