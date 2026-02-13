import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { AnthropicClient } from "../src/llm/anthropic-client.js";

describe("AnthropicClient", () => {
  const prevKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "ak-test";
  });

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = prevKey;
  });

  it("executes tool calls and returns final text", async () => {
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              type: "tool_use",
              id: "tu1",
              name: "read_file",
              input: { path: "a.txt" },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: "text", text: "done" }],
        }),
      });

    const prevFetch = globalThis.fetch;
    (globalThis as any).fetch = fetchMock;

    const tools = {
      list: () => [
        {
          name: "read_file",
          description: "x",
          parameters: {
            type: "object",
            properties: { path: { type: "string" } },
            required: ["path"],
          },
        },
      ],
      execute: vi.fn(async () => "hello"),
    };

    const client = await AnthropicClient.create("claude-3-5-sonnet-20241022");
    const res = await client.generateWithTools({
      messages: [{ role: "user", content: "read" }],
      tools: tools as any,
      maxSteps: 4,
    });
    expect(res.outputText).toBe("done");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((tools.execute as any).mock.calls.length).toBe(1);
    (globalThis as any).fetch = prevFetch;
  });

  it("streams text", async () => {
    const sse = [
      'event: content_block_start\ndata: {"content_block":{"type":"text","text":""}}\n\n',
      'event: content_block_delta\ndata: {"delta":{"type":"text_delta","text":"he"}}\n\n',
      'event: content_block_delta\ndata: {"delta":{"type":"text_delta","text":"llo"}}\n\n',
      "event: message_stop\ndata: {}\n\n",
    ].join("");
    const bytes = new TextEncoder().encode(sse);
    let used = false;

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => ({
          read: async () => {
            if (used) return { done: true, value: undefined };
            used = true;
            return { done: false, value: bytes };
          },
        }),
      },
    });

    const prevFetch = globalThis.fetch;
    (globalThis as any).fetch = fetchMock;

    const client = await AnthropicClient.create("claude-3-5-sonnet-20241022");
    const deltas: string[] = [];
    const res = await client.streamWithTools!({
      messages: [{ role: "user", content: "hi" }],
      tools: { list: () => [], execute: async () => "" } as any,
      onText: (d) => deltas.push(d),
      maxSteps: 1,
    });
    expect(res.outputText).toBe("hello");
    expect(deltas.join("")).toBe("hello");
    (globalThis as any).fetch = prevFetch;
  });

  it("streams tool calls", async () => {
    const sse1 = [
      'event: content_block_start\ndata: {"content_block":{"type":"tool_use","id":"tu1","name":"read_file"}}\n\n',
      'event: content_block_delta\ndata: {"delta":{"type":"input_json_delta","partial_json":"{\\"path\\":\\"a.txt\\"}"}}\n\n',
      "event: message_stop\ndata: {}\n\n",
    ].join("");
    const sse2 = [
      'event: content_block_start\ndata: {"content_block":{"type":"text","text":""}}\n\n',
      'event: content_block_delta\ndata: {"delta":{"type":"text_delta","text":"done"}}\n\n',
      "event: message_stop\ndata: {}\n\n",
    ].join("");

    const bytes1 = new TextEncoder().encode(sse1);
    const bytes2 = new TextEncoder().encode(sse2);
    let used1 = false;
    let used2 = false;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => ({
            read: async () => {
              if (used1) return { done: true, value: undefined };
              used1 = true;
              return { done: false, value: bytes1 };
            },
          }),
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => ({
            read: async () => {
              if (used2) return { done: true, value: undefined };
              used2 = true;
              return { done: false, value: bytes2 };
            },
          }),
        },
      });

    const prevFetch = globalThis.fetch;
    (globalThis as any).fetch = fetchMock;

    const tools = {
      list: () => [
        {
          name: "read_file",
          description: "x",
          parameters: {
            type: "object",
            properties: { path: { type: "string" } },
            required: ["path"],
          },
        },
      ],
      execute: vi.fn(async (call: any) => {
        expect(call.name).toBe("read_file");
        return "hello";
      }),
    };

    const client = await AnthropicClient.create("claude-3-5-sonnet-20241022");
    const res = await client.streamWithTools!({
      messages: [{ role: "user", content: "read" }],
      tools: tools as any,
      onText: () => undefined,
      maxSteps: 2,
    });
    expect(res.outputText).toBe("done");
    expect((tools.execute as any).mock.calls.length).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    (globalThis as any).fetch = prevFetch;
  });

  it("errors when stream body is missing", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, body: null });
    const prevFetch = globalThis.fetch;
    (globalThis as any).fetch = fetchMock;

    const client = await AnthropicClient.create("claude-3-5-sonnet-20241022");
    await expect(
      client.streamWithTools!({
        messages: [{ role: "user", content: "x" }],
        tools: { list: () => [], execute: async () => "" } as any,
        onText: () => undefined,
        maxSteps: 1,
      }),
    ).rejects.toThrow(/missing body/);
    (globalThis as any).fetch = prevFetch;
  });
});
