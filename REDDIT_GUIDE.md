# Reddit Posting Guide for Platypus CLI

## Subreddit Recommendations (Best to Worst)

### 🥇 Tier 1: High Impact, Good Fit

#### r/SideProject (630k+ members)

**Best for:** Launch announcements, "I built this" posts
**Tone:** Casual, excited, "Show and tell"
**Rules:** Must be your own project
**Best time:** Weekday evenings US time

**Post Template:**

```
[Showoff Saturday] Built an open-source multi-agent coding assistant

After getting frustrated with Claude Code's single-agent limitation, I built Platypus CLI — a coding assistant that can spawn multiple agents working in parallel, each using different LLMs (OpenAI, Claude, Gemini).

The platypus metaphor: nature's weird hybrid that somehow works. That's this tool — part LLM client, part agent orchestrator, part terminal utility.

Key features:
• Multi-agent orchestration (3-5 agents simultaneously)
• Provider agnostic (use your own API keys)
• Local-first (SQLite state, works offline)
• Smart command safety (blocklist, not allowlist prison)

244 tests, CI passing, v1.1.1 just shipped.

GitHub: https://github.comirfircelik/platypus-cli
npm: npm install -g platypus-cli

Would love feedback from anyone building with AI agents!
```

---

#### r/commandline (180k+ members)

**Best for:** CLI tool enthusiasts
**Tone:** Technical, focused on workflow improvements
**Rules:** Must be CLI-related, no GUI spam

**Post Template:**

```
Platypus CLI — Multi-agent coding assistant for the terminal

I've been working on a CLI tool that brings multi-agent orchestration to your terminal. Think Claude Code, but you can spawn 3 agents side-by-side, each using different LLMs, all working on different parts of your codebase.

What's different from other coding assistants:
• Spawn teams, not solo acts — multiple agents in parallel
• Your choice of backend — OpenAI, Anthropic, or Google
• Local state (SQLite) — works offline, your data stays yours
• Smart command filtering — blocks dangerous commands without being annoying

Built with TypeScript, tmux for screen management, and better-sqlite3 for state.

v1.1.1 is out with streaming support for all 3 providers.

GitHub: https://github.com/firfircelik/platypus-cli

Curious what the CLI folks think about multi-agent workflows in the terminal.
```

---

#### r/opensource (185k+ members)

**Best for:** Open source project launches
**Tone:** Community-focused, collaborative
**Rules:** Must be open source license

**Post Template:**

```
[Open Source] Platypus CLI — Multi-agent coding assistant

Just released v1.1.1 of Platypus CLI, an open-source alternative to closed coding assistants like Claude Code.

Philosophy: No vendor lock-in, no cloud dependency, full transparency.

What makes it different:
• Multi-agent from day one (not an afterthought)
• SQLite state — works completely offline
• Bring your own API keys (OpenAI, Anthropic, Google)
• MIT licensed, PRs welcome

The "platypus" name comes from the animal being nature's weird hybrid — part mammal, part bird, part reptile. This tool is the same: part LLM client, part agent orchestrator, part terminal utility.

Looking for contributors and testers!

GitHub: https://github.com/firfircelik/platypus-cli
```

---

### 🥈 Tier 2: Good Engagement, More Specific

#### r/typescript (95k+ members)

**Best for:** TypeScript developers
**Tone:** Technical, type-system focused
**Focus:** Implementation details, architecture

**Post Template:**

```
Built a multi-agent CLI in TypeScript — lessons learned

After 3 months of building Platypus CLI (open-source coding assistant), wanted to share some TypeScript architecture decisions:

1. **Strict typing for LLM messages** — Discriminated unions for user/assistant/tool roles saved countless bugs
2. **SQLite with better-sqlite3** — Synchronous DB access simplified the async-heavy agent logic
3. **Provider abstraction** — Clean interface lets us swap OpenAI/Anthropic/Google without touching business logic
4. **Testing with Vitest** — 244 tests across 58 files, mocking fetch for LLM calls

The codebase: https://github.com/firfircelik/platypus-cli

Happy to discuss the architecture with fellow TS devs!
```

---

#### r/LocalLLaMA (875k+ members)

**Best for:** Local/offline AI focus
**Tone:** Privacy-focused, anti-cloud
**Key angle:** Works offline with SQLite

**Post Template:**

```
Platypus CLI — Coding assistant that works offline (SQLite state)

Most coding assistants (Claude Code, etc.) are cloud-dependent black boxes. I wanted something different.

Platypus CLI keeps everything local:
• SQLite database for state (no internet needed)
• Redis optional (for multi-agent message bus)
• Your API keys, your data, your control
• Can run completely air-gapped after setup

Multi-agent orchestration means you can spawn 3 agents working in parallel, all local.

v1.1.1 with streaming support just dropped.

GitHub: https://github.com/firfircelik/platypus-cli

Anyone else building local-first AI tools?
```

---

#### r/selfhosted (340k+ members)

**Best for:** Self-hosted tool enthusiasts
**Tone:** Privacy-focused, DIY
**Key angle:** You control everything

**Post Template:**

```
Self-hosted coding assistant — Platypus CLI

Tired of cloud-dependent coding assistants phoning home? Built something different.

Platypus CLI:
✓ SQLite state (completely local)
✓ Redis optional (for distributed agents)
✓ Your API keys (OpenAI/Anthropic/Google)
✓ No telemetry, no cloud dependency
✓ Multi-agent support (spawn teams locally)

MIT licensed, runs on your machine, your data never leaves.

npm install -g platypus-cli
GitHub: https://github.com/firfircelik/platypus-cli

Looking for self-hosting enthusiasts to test and break it.
```

---

### 🥉 Tier 3: Broader Reach, Harder to Stand Out

#### r/programming (5.8M+ members)

**Best for:** Massive reach, general dev audience
**Tone:** Professional but engaging
**Risk:** Can get buried quickly
**Tip:** Post early morning US time (7-9 AM EST)

**Post Template:**

```
I built an open-source multi-agent coding assistant

After hitting walls with existing tools (single agent, vendor lock-in, cloud dependency), I built Platypus CLI.

Core idea: Spawn multiple AI agents that work in parallel, each can use different LLMs, all orchestrated from your terminal.

Tech stack:
• TypeScript + Node.js
• tmux for agent screen management
• SQLite for local state
• better-sqlite3 for performance
• Vitest for testing (244 tests)

v1.1.1 just shipped with streaming for all 3 providers (OpenAI, Anthropic, Google).

GitHub: https://github.com/firfircelik/platypus-cli

Would appreciate feedback from the programming community!
```

---

## Reddit-Specific Tips

### ✅ DO:

- **Flair your post** — Most subreddits require flair (e.g., "Showoff", "Open Source", "Project")
- **Respond to comments** — Reddit algorithm boosts posts with engagement
- **Be honest about limitations** — Redditors smell marketing BS instantly
- **Post source code** — GitHub link is required for credibility
- **Time it right:**
  - Best: Tuesday-Thursday, 7-10 AM EST
  - Avoid: Weekends (lower engagement)
- **Cross-post strategically** — Wait 24-48 hours between subreddits

### ❌ DON'T:

- **Don't spam** — Posting to 10 subreddits simultaneously looks like spam
- **Don't use marketing speak** — "Revolutionary!" "Game-changer!" = instant downvotes
- **Don't ignore the rules** — Each subreddit has specific self-promotion rules
- **Don't delete negative comments** — Engage with criticism instead
- **Don't post just a link** — Reddit hates link-only posts, add context

---

## Suggested Posting Strategy

### Week 1 — Launch

1. **r/SideProject** — Primary launch (highest engagement for new tools)
2. **r/commandline** — 24 hours later (technical audience)

### Week 2 — Niche Communities

3. **r/typescript** — Architecture deep dive
4. **r/LocalLLaMA** — Privacy/local angle

### Week 3 — Broader Reach

5. **r/opensource** — Community building
6. **r/programming** — Only if earlier posts did well

---

## Engagement Template (Reply to Comments)

When someone comments, reply with substance:

**If they ask a question:**

```
Great question! [Answer in detail].

If you want to dig deeper, the relevant code is in src/engine/[file].ts — happy to explain the architecture!
```

**If they criticize:**

```
Fair point! [Acknowledge the issue].

That's actually on the roadmap / Fixed in v1.1.1 / Would love a PR if you're interested!
```

**If they show interest:**

```
Thanks! Would love your feedback if you try it out.

Open an issue on GitHub if you hit any bugs — I respond to everything within 24 hours.
```

---

## TL;DR — Start Here

**Best single post:** r/SideProject with the first template
**Best time:** Tuesday 8 AM EST
**Golden rule:** Be a redditor first, promoter second

---

**Good luck! 🚀**
