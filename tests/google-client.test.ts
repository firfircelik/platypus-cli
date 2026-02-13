import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { GoogleClient } from "../src/llm/google-client.js";

describe("GoogleClient", () => {
  const prevKey = process.env.GOOGLE_API_KEY;

  beforeEach(() => {
    process.env.GOOGLE_API_KEY = "gk-test";
  });

  afterEach(() => {
    process.env.GOOGLE_API_KEY = prevKey;
  });

  it("executes tool calls and returns final text", async () => {
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: "read_file",
                      args: { path: "a.txt" },
                    },
                  },
                ],
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "done" }] } }],
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

    const client = await GoogleClient.create("gemini-1.5-flash");
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
      'data: {"candidates":[{"content":{"parts":[{"text":"he"}]}}]}\n\n',
      'data: {"candidates":[{"content":{"parts":[{"text":"llo"}]}}]}\n\n',
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

    const client = await GoogleClient.create("gemini-1.5-flash");
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
      'data: {"candidates":[{"content":{"parts":[{"functionCall":{"name":"read_file","args":{"path":"a.txt"}}}]}}]}\n\n',
    ].join("");
    const sse2 = [
      'data: {"candidates":[{"content":{"parts":[{"text":"done"}]}}]}\n\n',
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

    const client = await GoogleClient.create("gemini-1.5-flash");
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

    const client = await GoogleClient.create("gemini-1.5-flash");
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
