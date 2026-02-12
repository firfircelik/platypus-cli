import { Flags } from "@oclif/core";
import { BaseCommand } from "../base-command.js";
import {
  createChatSession,
  type ChatSession,
} from "../../engine/chat-session.js";
import { createRepl } from "../../engine/repl.js";
import { loadProfile } from "../../core/profiles.js";
import { renderPlatypusBanner, shouldShowPlatypusBanner } from "../banner.js";
import { KeyStore } from "../../crypto/key-store.js";
import { Workspace } from "../../core/workspace.js";
import {
  createDefaultApprovalPrompt,
  createToolRegistry,
} from "../../engine/tooling.js";

export default class Chat extends BaseCommand {
  static description = "Interactive chat mode (Claude Code-style)";

  static flags = {
    provider: Flags.string({
      char: "p",
      default: "openai",
      description: "Provider id (e.g. openai)",
    }),
    model: Flags.string({
      char: "m",
      required: false,
      description: "Model name (provider-specific)",
    }),
    autoApprove: Flags.boolean({
      default: false,
      description: "Auto-approve tool actions",
    }),
    root: Flags.string({
      required: false,
      description: "Project root path (defaults to cwd)",
    }),
    profile: Flags.string({
      required: false,
      description: "Profile name (e.g. plan, build)",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Chat);
    const root = flags.root ? flags.root : process.cwd();
    const profile = flags.profile ? loadProfile(flags.profile) : null;
    const defaultProvider = (profile?.provider ?? flags.provider)
      .trim()
      .toLowerCase();

    // Check for existing API keys
    const keyStore = new KeyStore();
    await keyStore.initialize();
    const keys = await keyStore.listKeys();
    const hasKeys = keys.length > 0;
    const validProviders = keys.filter((k) => k.valid).map((k) => k.provider);

    if (shouldShowPlatypusBanner()) this.log(renderPlatypusBanner());

    // Show welcome/setup message if no keys configured
    if (!hasKeys) {
      this.log("👋 Welcome to Platypus CLI!");
      this.log("");
      this.log("To start chatting with AI, add an API key:");
      this.log("");
      this.log("  platypus keys add -p openai     # OpenAI (GPT-4, GPT-3.5)");
      this.log("  platypus keys add -p anthropic  # Anthropic (Claude)");
      this.log("  platypus keys add -p google     # Google (Gemini)");
      this.log("");
      this.log("You can still use local commands without an API key:");
      this.log("  /ls [dir]        - List files");
      this.log("  /cat <file>      - Read a file");
      this.log("  /search <query>  - Search files");
      this.log("  /run <command>   - Run a shell command");
      this.log("");
    } else if (validProviders.length > 0) {
      this.log(`✓ Configured providers: ${validProviders.join(", ")}`);
      this.log("");
    }

    this.log("Type /help for commands. Type /exit to quit.");
    this.log("");

    // Create workspace and tools for local operations (work without AI)
    const workspace = new Workspace(root);
    const approval = createDefaultApprovalPrompt({ autoApprove: false });
    const localTools = createToolRegistry({
      workspace,
      approval,
      agentId: "chat",
      allowedToolNames: [
        "read_file",
        "list_files",
        "search_files",
        "run_command",
        "show_writes",
        "apply_writes",
        "discard_writes",
      ],
    });

    // Try to create chat session if we have keys
    let session: ChatSession | null = null;
    let currentProvider = validProviders.includes(defaultProvider)
      ? defaultProvider
      : validProviders[0];

    if (currentProvider) {
      try {
        session = await createChatSession({
          provider: currentProvider,
          model: profile?.model ?? flags.model,
          root,
          autoApprove: profile?.autoApprove ?? flags.autoApprove,
          mode: profile?.mode ?? "build",
          allowedTools: profile?.allowedTools,
        });
      } catch (e) {
        // Silent fail - we'll show setup message when user tries to chat
      }
    }

    const repl = createRepl("platypus> ", {
      onLine: async (line) => {
        if (line === "/exit" || line === "/quit") {
          repl.close();
          return;
        }
        if (line === "/help") {
          const helpLines = [
            "/help, /exit, /quit",
            "/ls [dir]              - List files",
            "/cat <file>            - Read a file",
            "/search <query> [dir]  - Search files",
            "/run <command>         - Run a shell command",
            "/diff                  - Show staged changes or git diff",
            "/apply [ids]           - Apply staged writes",
            "/discard [ids]         - Discard staged writes",
          ];

          if (session) {
            helpLines.push(
              "/mode <plan|build>     - Set agent mode",
              "/cd <path>             - Change project root",
              "/provider <name>       - Switch provider",
              "/model <name>          - Set model",
              "",
              "Chat with AI by typing your message directly.",
            );
          } else {
            helpLines.push(
              "",
              "To enable AI chat, add an API key:",
              "  platypus keys add -p <provider>",
            );
          }

          repl.print(helpLines.join("\n"));
          return;
        }
        if (line.startsWith("/mode ")) {
          if (!session) {
            repl.print(
              "No AI provider configured. Add a key: platypus keys add -p <provider>",
            );
            return;
          }
          const m = line.slice(6).trim().toLowerCase();
          if (m !== "plan" && m !== "build") {
            repl.print("Usage: /mode <plan|build>");
            return;
          }
          await session.configure({ mode: m as any });
          repl.print(`OK (mode=${session.getConfig().mode})`);
          return;
        }
        if (line.startsWith("/cd ")) {
          const nextRoot = line.slice(4).trim();
          if (!nextRoot) {
            repl.print("Usage: /cd <path>");
            return;
          }
          if (session) {
            await session.configure({ root: nextRoot });
            repl.print(`OK (root=${session.getConfig().root})`);
          } else {
            // Update workspace for local tools
            workspace.changeRoot(nextRoot);
            repl.print(`OK (root=${nextRoot})`);
          }
          return;
        }
        if (line.startsWith("/provider ")) {
          const p = line.slice(10).trim().toLowerCase();
          if (!p) {
            repl.print("Usage: /provider <openai|anthropic|google>");
            return;
          }

          // Check if key exists for this provider
          const providerKeys = keys.filter((k) => k.provider === p && k.valid);
          if (providerKeys.length === 0) {
            repl.print(`No valid key found for provider: ${p}`);
            repl.print(`Add a key with: platypus keys add -p ${p}`);
            return;
          }

          if (session) {
            await session.configure({ provider: p });
            repl.print(`OK (provider=${session.getConfig().provider})`);
          } else {
            // Try to create session with this provider
            try {
              session = await createChatSession({
                provider: p,
                model: profile?.model ?? flags.model,
                root,
                autoApprove: profile?.autoApprove ?? flags.autoApprove,
                mode: profile?.mode ?? "build",
                allowedTools: profile?.allowedTools,
              });
              currentProvider = p;
              repl.print(`OK (provider=${p})`);
              repl.print("AI chat is now enabled!");
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Unknown error";
              repl.print(`Failed to initialize provider: ${msg}`);
            }
          }
          return;
        }
        if (line.startsWith("/model ")) {
          if (!session) {
            repl.print(
              "No AI provider configured. Add a key: platypus keys add -p <provider>",
            );
            return;
          }
          const m = line.slice(7).trim();
          if (!m) {
            repl.print("Usage: /model <name>");
            return;
          }
          await session.configure({ model: m });
          repl.print(`OK (model=${session.getConfig().model ?? ""})`);
          return;
        }
        if (line === "/diff") {
          const staged = await localTools.execute({
            id: "repl",
            name: "show_writes",
            arguments: { summaryOnly: false },
          });
          if (staged.trim().length > 0) {
            repl.print(staged);
            return;
          }
          const { spawnSync } = await import("node:child_process");
          const result = spawnSync("git", ["diff"], {
            cwd: root,
            encoding: "utf8",
          });
          const out = result.stdout || "";
          repl.print(out.trim().length > 0 ? out : "(no diff)");
          return;
        }
        if (line === "/apply" || line.startsWith("/apply ")) {
          const rest = line.slice(6).trim();
          const ids =
            rest.length > 0
              ? rest
                  .split(",")
                  .map((s) => Number(s.trim()))
                  .filter((n) => Number.isFinite(n))
              : undefined;
          const out = await localTools.execute({
            id: "repl",
            name: "apply_writes",
            arguments: { ids },
          });
          repl.print(out);
          return;
        }
        if (line === "/discard" || line.startsWith("/discard ")) {
          const rest = line.slice(8).trim();
          const ids =
            rest.length > 0
              ? rest
                  .split(",")
                  .map((s) => Number(s.trim()))
                  .filter((n) => Number.isFinite(n))
              : undefined;
          const out = await localTools.execute({
            id: "repl",
            name: "discard_writes",
            arguments: { ids },
          });
          repl.print(out);
          return;
        }
        if (line.startsWith("/ls")) {
          const arg = line.slice(3).trim();
          const out = await localTools.execute({
            id: "repl",
            name: "list_files",
            arguments: { dir: arg.length > 0 ? arg : "." },
          });
          repl.print(out.trim().length > 0 ? out : "(empty)");
          return;
        }
        if (line.startsWith("/cat ")) {
          const p = line.slice(5).trim();
          if (!p) {
            repl.print("Usage: /cat <file>");
            return;
          }
          const out = await localTools.execute({
            id: "repl",
            name: "read_file",
            arguments: { path: p },
          });
          repl.print(out);
          return;
        }
        if (line.startsWith("/run ")) {
          const cmd = line.slice(5).trim();
          if (!cmd) {
            repl.print("Usage: /run <command>");
            return;
          }
          const out = await localTools.execute({
            id: "repl",
            name: "run_command",
            arguments: { command: cmd },
          });
          repl.print(out.trim().length > 0 ? out : "OK");
          return;
        }
        if (line.startsWith("/search ")) {
          const rest = line.slice(8).trim();
          if (!rest) {
            repl.print("Usage: /search <query> [dir]");
            return;
          }
          const parts = rest.split(" ");
          const query = parts[0];
          const dir = parts.slice(1).join(" ").trim();
          const out = await localTools.execute({
            id: "repl",
            name: "search_files",
            arguments: { query, dir: dir.length > 0 ? dir : "." },
          });
          repl.print(out.trim().length > 0 ? out : "(no matches)");
          return;
        }
        if (line.startsWith("/")) {
          repl.print("Unknown command. Type /help.");
          return;
        }

        // Handle chat message
        if (!session) {
          repl.print(
            "No AI provider configured. To chat with AI, add an API key:",
          );
          repl.print("");
          repl.print("  platypus keys add -p openai");
          repl.print("  platypus keys add -p anthropic");
          repl.print("  platypus keys add -p google");
          repl.print("");
          repl.print("Or use /help to see available local commands.");
          return;
        }

        process.stdout.write("");
        const out = await session.handleUserMessageStream(line, (delta) =>
          process.stdout.write(delta),
        );
        if (out.trim().length > 0) process.stdout.write("\n");
      },
      onExit: async () => undefined,
    });

    await repl.start();
  }
}
