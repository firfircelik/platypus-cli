import { describe, expect, it } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { Workspace } from "../src/core/workspace.js";
import {
  createDefaultApprovalPrompt,
  createToolRegistry,
} from "../src/engine/tooling.js";

describe("tooling", () => {
  it("auto-approves prompt helpers", async () => {
    const approval = createDefaultApprovalPrompt({ autoApprove: true });
    expect(await approval.confirmRun("x")).toBe(true);
    expect(await approval.confirmWrite("a.txt", "diff")).toBe(true);
  });

  it("reads files and denies blocklisted commands", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "platypus-tools-"));
    fs.writeFileSync(path.join(tmpDir, "a.txt"), "hello", "utf8");

    const ws = new Workspace(tmpDir);
    const approval = createDefaultApprovalPrompt({ autoApprove: true });
    const tools = createToolRegistry({ workspace: ws, approval, agentId: "t" });

    const txt = await tools.execute({
      id: "1",
      name: "read_file",
      arguments: { path: "a.txt" },
    });
    expect(txt).toBe("hello");

    const denied = await tools.execute({
      id: "2",
      name: "run_command",
      arguments: { command: "rm -rf /" },
    });
    expect(denied).toMatch(/Denied/);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("writes files and runs allowlisted commands", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "platypus-tools-2-"));
    const ws = new Workspace(tmpDir);
    const approval = createDefaultApprovalPrompt({ autoApprove: true });
    const tools = createToolRegistry({ workspace: ws, approval, agentId: "t" });

    const ok = await tools.execute({
      id: "3",
      name: "write_file",
      arguments: { path: "b.txt", content: "hi" },
    });
    expect(ok.length).toBeGreaterThan(0);
    expect(fs.readFileSync(path.join(tmpDir, "b.txt"), "utf8")).toBe("hi");

    const out = await tools.execute({
      id: "4",
      name: "run_command",
      arguments: { command: "node --version" },
    });
    expect(out).toMatch(/v\d+/);

    const staged = await tools.execute({
      id: "4b",
      name: "show_writes",
      arguments: {},
    });
    expect(staged).toBe("");

    const list = await tools.execute({
      id: "5",
      name: "list_files",
      arguments: { dir: "." },
    });
    expect(list).toContain("b.txt");

    const unknown = await tools.execute({
      id: "6",
      name: "nope",
      arguments: {},
    });
    expect(unknown).toMatch(/unknown tool/);

    const nothing = await tools.execute({
      id: "7",
      name: "apply_writes",
      arguments: {},
    });
    expect(nothing).toMatch(/Nothing/);

    const cmdErr = await tools.execute({
      id: "8",
      name: "run_command",
      arguments: { command: "" },
    });
    expect(cmdErr).toMatch(/required/);

    fs.writeFileSync(path.join(tmpDir, "bad.json"), "{", "utf8");
    const bad = await tools.execute({
      id: "9",
      name: "read_json",
      arguments: { path: "bad.json" },
    });
    expect(bad).toMatch(/Error:/);

    const badWrite = await tools.execute({
      id: "10",
      name: "write_json",
      arguments: { path: "x.json", value: BigInt(1) as any },
    });
    expect(badWrite).toMatch(/Error:/);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("read_json parses and pretty-prints valid JSON", async () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "platypus-tools-json-"),
    );
    const ws = new Workspace(tmpDir);
    const approval = createDefaultApprovalPrompt({ autoApprove: true });
    const tools = createToolRegistry({ workspace: ws, approval, agentId: "t" });

    const validJson = { name: "test", count: 42, nested: { key: "value" } };
    fs.writeFileSync(
      path.join(tmpDir, "valid.json"),
      JSON.stringify(validJson),
      "utf8",
    );

    const result = await tools.execute({
      id: "11",
      name: "read_json",
      arguments: { path: "valid.json" },
    });
    const parsed = JSON.parse(result);
    expect(parsed).toEqual(validJson);
    expect(result).toMatch(/\{\s+"name":\s+"test"/);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("read_json returns error for missing path", async () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "platypus-tools-read-"),
    );
    const ws = new Workspace(tmpDir);
    const approval = createDefaultApprovalPrompt({ autoApprove: true });
    const tools = createToolRegistry({ workspace: ws, approval, agentId: "t" });

    const result = await tools.execute({
      id: "12",
      name: "read_json",
      arguments: {},
    });
    expect(result).toBe("Error: path is required");

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("write_json creates pretty-printed JSON files", async () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "platypus-tools-write-"),
    );
    const ws = new Workspace(tmpDir);
    const approval = createDefaultApprovalPrompt({ autoApprove: true });
    const tools = createToolRegistry({ workspace: ws, approval, agentId: "t" });

    const value = {
      project: "platypus",
      version: 1.0,
      features: ["test", "json"],
    };
    const result = await tools.execute({
      id: "13",
      name: "write_json",
      arguments: { path: "output.json", value },
    });
    expect(result).toMatch(/output.json/);

    const content = fs.readFileSync(path.join(tmpDir, "output.json"), "utf8");
    const parsed = JSON.parse(content);
    expect(parsed).toEqual(value);
    expect(content).toMatch(/\{\s+"project":\s+"platypus"/);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("write_json returns error for missing path", async () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "platypus-tools-write2-"),
    );
    const ws = new Workspace(tmpDir);
    const approval = createDefaultApprovalPrompt({ autoApprove: true });
    const tools = createToolRegistry({ workspace: ws, approval, agentId: "t" });

    const result = await tools.execute({
      id: "14",
      name: "write_json",
      arguments: { value: {} },
    });
    expect(result).toBe("Error: path is required");

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("search_files finds text patterns in directory", async () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "platypus-tools-search-"),
    );
    const ws = new Workspace(tmpDir);
    const approval = createDefaultApprovalPrompt({ autoApprove: true });
    const tools = createToolRegistry({ workspace: ws, approval, agentId: "t" });

    fs.writeFileSync(
      path.join(tmpDir, "file1.ts"),
      "export function test() { return true }",
      "utf8",
    );
    fs.writeFileSync(
      path.join(tmpDir, "file2.ts"),
      "const testValue = 42",
      "utf8",
    );

    const result = await tools.execute({
      id: "15",
      name: "search_files",
      arguments: { query: "test", dir: "." },
    });
    expect(result).toContain("file1.ts:1:");
    expect(result).toContain("file2.ts:1:");

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("search_files respects maxResults parameter", async () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "platypus-tools-max-"),
    );
    const ws = new Workspace(tmpDir);
    const approval = createDefaultApprovalPrompt({ autoApprove: true });
    const tools = createToolRegistry({ workspace: ws, approval, agentId: "t" });

    for (let i = 0; i < 10; i++) {
      fs.writeFileSync(
        path.join(tmpDir, `file${i}.txt`),
        `test line ${i}`,
        "utf8",
      );
    }

    const result = await tools.execute({
      id: "16",
      name: "search_files",
      arguments: { query: "test", dir: ".", maxResults: 3 },
    });
    const lines = result.split("\n").filter((l) => l.trim().length > 0);
    expect(lines.length).toBeLessThanOrEqual(3);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("search_files returns error for missing query", async () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "platypus-tools-noq-"),
    );
    const ws = new Workspace(tmpDir);
    const approval = createDefaultApprovalPrompt({ autoApprove: true });
    const tools = createToolRegistry({ workspace: ws, approval, agentId: "t" });

    const result = await tools.execute({
      id: "17",
      name: "search_files",
      arguments: { dir: "." },
    });
    expect(result).toBe("Error: query is required");

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("search_files handles empty directory gracefully", async () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "platypus-tools-empty-"),
    );
    const ws = new Workspace(tmpDir);
    const approval = createDefaultApprovalPrompt({ autoApprove: true });
    const tools = createToolRegistry({ workspace: ws, approval, agentId: "t" });

    const result = await tools.execute({
      id: "18",
      name: "search_files",
      arguments: { query: "nonexistent", dir: "." },
    });
    expect(result).toBe("");

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
