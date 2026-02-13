# LinkedIn Post: Platypus CLI v1.1.1 Release

**Save this for your LinkedIn post!** 🚀

---

## Option 1: Technical Deep Dive (Recommended)

🚀 **Just shipped Platypus CLI v1.1.1 — and it's a complete overhaul of the core agent.**

When I started this project, I wanted something Claude Code couldn't give me: **full control, multi-agent orchestration, and zero vendor lock-in.**

Here's what v1.1.1 brings to the table:

**🧠 System Prompt Rewrite**
The old 1-sentence prompt ("You are a coding assistant...") wasn't cutting it. Built a comprehensive prompt builder with mode awareness (plan vs build), tool guidance, and project context injection. LLM now actually understands the codebase before touching files.

**🛡️ Safety-First Command Blocklist**
Moved from a restrictive 7-command allowlist to a smart blocklist (~40 dangerous commands + shell pattern detection). Platypus now blocks `curl | sh`, command substitution, and writes to /etc — without limiting legitimate dev workflows.

**⚡ Streaming for ALL Providers**
OpenAI had streaming. Now Anthropic (Claude) and Google (Gemini) do too. Real-time token streaming across every supported LLM.

**📈 50x More Tool Calls**
Default maxSteps: 8 → 50. Complex refactors that needed 40+ tool calls? Now handled in one session.

**244 tests. 58 test files. CI passing on Node 20 & 22.**

---

## Option 2: The "Why" Post (Story-Driven)

I tried Claude Code. Liked it. But three things bugged me:

1. **Single-agent only** — No way to spawn specialized agents for different tasks
2. **Closed ecosystem** — Locked to Anthropic
3. **My data, their servers** — Full telemetry, no local option

So I built Platypus CLI. **Open-source, multi-agent, provider-agnostic.**

v1.1.1 is the release where it stops being a "cool side project" and starts being a **real alternative**:

✅ Multi-agent orchestration with tmux-based screen management  
✅ SQLite state + Redis message bus — works offline, scales up  
✅ OpenAI, Anthropic, Google — use your API keys, your choice  
✅ BMAD workflows built-in (spec → dev → review)  
✅ Command safety without hand-holding (smart blocklist, not allowlist prison)

GitHub: https://github.com/firfircelik/platypus-cli  
npm: `npm install -g platypus-cli`

---

## Option 3: Short & Punchy

**Platypus CLI v1.1.1 is out.**

The open-source alternative to Claude Code / opencode / Gemini CLI:

🦆 Multi-agent orchestration (not single-agent)  
🦆 Provider-agnostic (OpenAI, Anthropic, Google)  
🦆 Local-first (SQLite state, works offline)  
🦆 Safety without restriction (blocklist > allowlist)  
🦆 244 tests, CI green, production-ready

`npm install -g platypus-cli`

---

## Option 4: Comparison Table Format

**Why I built Platypus CLI instead of using Claude Code:**

| Feature          | Claude Code       | Platypus CLI               |
| ---------------- | ----------------- | -------------------------- |
| Multi-agent      | ❌ Single         | ✅ Spawn teams             |
| Provider         | ❌ Anthropic only | ✅ OpenAI/Anthropic/Google |
| Local state      | ❌ Cloud          | ✅ SQLite + Redis          |
| Open source      | ❌ Closed         | ✅ MIT License             |
| Custom workflows | ❌ Limited        | ✅ BMAD built-in           |
| Command safety   | ✅                | ✅ (smart blocklist)       |

v1.1.1 just shipped with streaming for all providers, 50-step tool chains, and a complete system prompt overhaul.

Try it: `npm install -g platypus-cli`

---

## Option 5: Developer-Focused (Code Samples)

**Tired of AI assistants that don't understand your codebase?**

Platypus CLI v1.1.1 now injects project context into every LLM call:

```typescript
// system-prompt.ts
buildSystemPrompt({
  mode: "build",
  toolNames: ["read_file", "write_file", "run_command"],
  projectContext: `
    This is a Node.js project using TypeScript.
    Package: platypus-cli v1.1.1
    Architecture: Multi-agent with SQLite state
  `,
});
```

Result: The LLM actually knows what it's working on before suggesting changes.

Other v1.1.1 highlights:

- Streaming across all 3 providers (OpenAI, Anthropic, Google)
- Smart command blocklist (dangerous patterns detected, safe commands allowed)
- 50 tool-call steps (up from 8)
- 244 tests, all green

`npm install -g platypus-cli`

---

## Hashtags to Use:

#opensource #ai #codingassistant #cli #developer #typescript #nodejs #multiagent #llm #claude #openai #anthropic #googleai #devtools #automation

---

## Notes for Posting:

1. **Best time to post**: Tuesday-Thursday, 8-10 AM or 12-1 PM (your timezone)
2. **Add a visual**: Screenshot of the new ASCII banner or terminal recording (asciinema)
3. **Engage**: Reply to comments within first hour for algorithm boost
4. **Cross-post**: Twitter/X for dev community reach

---

**Choose the option that fits your style!** Option 1 or 2 work best for LinkedIn's algorithm (longer posts = more engagement).
