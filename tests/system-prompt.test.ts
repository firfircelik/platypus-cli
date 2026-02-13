import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "../src/llm/system-prompt.js";
import { DEFAULT_MAX_STEPS } from "../src/llm/types.js";

describe("buildSystemPrompt", () => {
  it("includes Platypus identity", () => {
    const prompt = buildSystemPrompt({ mode: "build", toolNames: [] });
    expect(prompt).toContain("Platypus");
    expect(prompt).toContain("coding assistant");
  });

  it("includes build mode section when mode is build", () => {
    const prompt = buildSystemPrompt({
      mode: "build",
      toolNames: ["read_file", "write_file"],
    });
    expect(prompt).toContain("BUILD");
    expect(prompt).toContain("read+write");
    expect(prompt).not.toContain("PLAN");
  });

  it("includes plan mode section when mode is plan", () => {
    const prompt = buildSystemPrompt({
      mode: "plan",
      toolNames: ["read_file", "list_files"],
    });
    expect(prompt).toContain("PLAN");
    expect(prompt).toContain("read-only");
    expect(prompt).not.toContain("Current Mode: BUILD");
  });

  it("lists available tool names", () => {
    const prompt = buildSystemPrompt({
      mode: "build",
      toolNames: ["read_file", "write_file", "run_command"],
    });
    expect(prompt).toContain("read_file");
    expect(prompt).toContain("write_file");
    expect(prompt).toContain("run_command");
    expect(prompt).toContain("Available Tools");
  });

  it("omits tools section when no tools available", () => {
    const prompt = buildSystemPrompt({ mode: "build", toolNames: [] });
    expect(prompt).not.toContain("Available Tools");
  });

  it("includes project context when provided", () => {
    const context =
      "This is a Node.js project using TypeScript.\nPackage: platypus-cli v1.1.0";
    const prompt = buildSystemPrompt({
      mode: "build",
      toolNames: [],
      projectContext: context,
    });
    expect(prompt).toContain("Project Context");
    expect(prompt).toContain("platypus-cli v1.1.0");
    expect(prompt).toContain("Node.js");
  });

  it("omits project context when not provided", () => {
    const prompt = buildSystemPrompt({ mode: "build", toolNames: [] });
    expect(prompt).not.toContain("Project Context");
  });

  it("includes tool usage guidelines when tools are present", () => {
    const prompt = buildSystemPrompt({
      mode: "build",
      toolNames: ["read_file"],
    });
    expect(prompt).toContain("read before writing");
    expect(prompt).toContain("search_files");
  });

  it("includes response guidelines", () => {
    const prompt = buildSystemPrompt({ mode: "build", toolNames: [] });
    expect(prompt).toContain("Response Guidelines");
    expect(prompt).toContain("markdown");
  });

  it("includes core principles", () => {
    const prompt = buildSystemPrompt({ mode: "build", toolNames: [] });
    expect(prompt).toContain("Be precise and correct");
    expect(prompt).toContain("Follow existing patterns");
    expect(prompt).toContain("Think step by step");
  });

  it("reminds user to switch mode in plan mode", () => {
    const prompt = buildSystemPrompt({ mode: "plan", toolNames: [] });
    expect(prompt).toContain("/mode build");
  });
});

describe("DEFAULT_MAX_STEPS", () => {
  it("equals 50", () => {
    expect(DEFAULT_MAX_STEPS).toBe(50);
  });

  it("is a positive integer", () => {
    expect(Number.isInteger(DEFAULT_MAX_STEPS)).toBe(true);
    expect(DEFAULT_MAX_STEPS).toBeGreaterThan(0);
  });
});
