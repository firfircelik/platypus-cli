import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

let events: Record<string, Function[]> = {};
let lastRl: any = null;

vi.mock("node:readline", () => ({
  default: {
    createInterface: () => {
      events = {};
      const rl: any = {
        setPrompt: vi.fn(),
        prompt: vi.fn(),
        close: vi.fn(() => {
          (events.close ?? []).forEach((fn) => fn());
        }),
        on: (name: string, fn: Function) => {
          events[name] = events[name] ?? [];
          events[name].push(fn);
          return rl;
        },
      };
      lastRl = rl;
      return rl;
    },
  },
}));

import { createRepl } from "../src/engine/repl.js";

describe("repl", () => {
  const prevHome = process.env.PLATYPUS_HOME;
  let tmpDir: string;
  const origResume = process.stdin.resume;
  const origPause = process.stdin.pause;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "platypus-repl-"));
    process.env.PLATYPUS_HOME = tmpDir;
    // Stub stdin.resume/pause so they don't affect the test runner
    process.stdin.resume = vi.fn().mockReturnValue(process.stdin);
    process.stdin.pause = vi.fn().mockReturnValue(process.stdin);
  });

  afterEach(() => {
    if (prevHome === undefined) delete process.env.PLATYPUS_HOME;
    else process.env.PLATYPUS_HOME = prevHome;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    process.stdin.resume = origResume;
    process.stdin.pause = origPause;
  });

  it("runs handler for lines and prints", async () => {
    const seen: string[] = [];
    fs.writeFileSync(
      path.join(process.env.PLATYPUS_HOME!, "history"),
      "a\nb\n",
      "utf8",
    );
    const repl = createRepl("p> ", {
      onLine: async (line) => {
        seen.push(line);
      },
      onExit: async () => undefined,
    });
    repl.print("x");

    // start() returns a promise that resolves when close() is called
    const done = repl.start();

    // Fire line events — empty lines should be ignored
    for (const fn of events.line ?? []) fn("");
    for (const fn of events.line ?? []) fn("hi");

    // Wait a tick for async onLine handlers to resolve
    await new Promise((r) => setTimeout(r, 20));

    // Close to resolve the start() promise
    repl.close();
    await done;

    expect(seen).toContain("hi");
    expect(seen).not.toContain("");
    expect(Array.isArray(lastRl.history)).toBe(true);
    expect(lastRl.history.join("\n")).toContain("b");
  });

  it("handles SIGINT and non-terminal output", async () => {
    let exited = 0;
    const repl = createRepl("p> ", {
      onLine: async () => undefined,
      onExit: async () => {
        exited += 1;
      },
    });
    repl.print("y");

    const done = repl.start();

    // Fire SIGINT — should call onExit and close
    for (const fn of events.SIGINT ?? []) fn();

    // Wait for async onExit to complete
    await new Promise((r) => setTimeout(r, 20));
    await done;

    expect(exited).toBeGreaterThan(0);
  });

  it("handles onLine errors gracefully", async () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const repl = createRepl("p> ", {
      onLine: async () => {
        throw new Error("boom");
      },
      onExit: async () => undefined,
    });

    const done = repl.start();

    for (const fn of events.line ?? []) fn("test");

    await new Promise((r) => setTimeout(r, 20));

    repl.close();
    await done;

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("boom"));
    stderrSpy.mockRestore();
  });

  it("handles history read and write failures", async () => {
    const existsMock = vi.spyOn(fs, "existsSync").mockReturnValue(true);
    const readMock = vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("read fail");
    });
    const mkdirMock = vi.spyOn(fs, "mkdirSync").mockImplementation(() => {
      throw new Error("mkdir fail");
    });
    const repl = createRepl("p> ", {
      onLine: async () => undefined,
      onExit: async () => undefined,
    });

    // Trigger close event to exercise writeHistory failure path
    lastRl.close();

    await new Promise((r) => setTimeout(r, 20));

    existsMock.mockRestore();
    readMock.mockRestore();
    mkdirMock.mockRestore();
    repl.close();
  });

  it("close is idempotent", async () => {
    const repl = createRepl("p> ", {
      onLine: async () => undefined,
      onExit: async () => undefined,
    });

    const done = repl.start();

    repl.close();
    repl.close(); // second call should be a no-op
    await done;

    // If we got here without error, idempotency works
    expect(lastRl.close).toHaveBeenCalledTimes(1);
  });
});
