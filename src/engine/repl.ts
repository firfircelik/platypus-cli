import readline from "node:readline";
import fs from "node:fs";
import path from "node:path";
import { getPlatypusHome } from "../core/paths.js";

export type ReplHandlers = {
  onLine(line: string): Promise<void>;
  onExit(): Promise<void>;
};

export type Repl = {
  start(): Promise<void>;
  print(text: string): void;
  close(): void;
};

export function createRepl(prompt: string, handlers: ReplHandlers): Repl {
  const isTerminal = Boolean(process.stdin.isTTY);

  // Keep stdin open — prevents the process from exiting if stdin
  // is not a TTY or gets disconnected unexpectedly.
  process.stdin.resume();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: isTerminal,
  });

  rl.setPrompt(prompt);

  const historyPath = path.join(getPlatypusHome(), "history");
  const initialHistory = readHistory(historyPath);
  if (initialHistory.length > 0)
    (rl as any).history = initialHistory.slice(0, 500).reverse();
  const appended: string[] = [];

  let closed = false;
  let resolveStartPromise: (() => void) | null = null;

  const close = () => {
    if (closed) return;
    closed = true;
    rl.close();
    process.stdin.pause();
    if (resolveStartPromise) {
      resolveStartPromise();
      resolveStartPromise = null;
    }
  };

  rl.on("SIGINT", () => {
    void handlers.onExit().finally(() => close());
  });

  const print = (text: string) => {
    if (closed) return;
    if (isTerminal) {
      process.stdout.write(`\n${text}\n`);
      rl.prompt(true);
      return;
    }
    process.stdout.write(`${text}\n`);
  };

  const start = (): Promise<void> => {
    return new Promise<void>((resolve) => {
      resolveStartPromise = resolve;

      rl.on("line", (line) => {
        if (closed) return;
        const trimmed = (line ?? "").trim();
        if (!trimmed) {
          rl.prompt();
          return;
        }
        appended.push(trimmed);
        handlers.onLine(trimmed).then(
          () => {
            if (!closed) rl.prompt();
          },
          (err) => {
            process.stderr.write(
              `Error: ${err instanceof Error ? err.message : String(err)}\n`,
            );
            if (!closed) rl.prompt();
          },
        );
      });

      rl.on("close", () => {
        writeHistory(historyPath, initialHistory, appended);
        void handlers.onExit().finally(() => {
          closed = true;
          process.stdin.pause();
          if (resolveStartPromise) {
            resolveStartPromise();
            resolveStartPromise = null;
          }
        });
      });

      rl.prompt();
    });
  };

  return { start, print, close };
}

function readHistory(filePath: string): string[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, "utf8");
    return raw
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  } catch {
    return [];
  }
}

function writeHistory(
  filePath: string,
  initial: string[],
  appended: string[],
): void {
  try {
    const merged = [...initial, ...appended].filter((s) => s.trim().length > 0);
    const uniqueTail: string[] = [];
    for (let i = merged.length - 1; i >= 0; i--) {
      const v = merged[i];
      if (uniqueTail.length >= 500) break;
      uniqueTail.push(v);
    }
    const out = uniqueTail.reverse().join("\n") + "\n";
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, out, "utf8");
  } catch {
    return;
  }
}
