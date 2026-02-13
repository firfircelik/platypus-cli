import type { LlmClient } from "./client.js";
import {
  DEFAULT_MAX_STEPS,
  type GenerateWithToolsInput,
  type GenerateWithToolsResult,
  type LlmMessage,
  type StreamWithToolsInput,
  type StreamWithToolsResult,
  type ToolCall,
} from "./types.js";
import { KeyStore } from "../crypto/key-store.js";

const DEFAULT_SYSTEM_PROMPT =
  "You are a coding assistant. Use tools when needed. Keep responses concise.";

type OpenAiChatMessage =
  | { role: "user" | "assistant" | "system"; content: string }
  | { role: "tool"; content: string; tool_call_id: string };

export class OpenAiClient implements LlmClient {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(
    apiKey: string,
    model: string,
    baseUrl: string = "https://api.openai.com/v1",
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl;
  }

  static async create(model?: string): Promise<OpenAiClient> {
    const envKey = process.env.OPENAI_API_KEY;
    const apiKey =
      envKey && envKey.trim().length > 0
        ? envKey.trim()
        : await OpenAiClient.loadFromKeyStore();
    const m = model ?? process.env.PLATYPUS_MODEL ?? "gpt-4o-mini";
    return new OpenAiClient(apiKey, m);
  }

  private static async loadFromKeyStore(): Promise<string> {
    const ks = new KeyStore();
    await ks.initialize();
    return ks.getKey("openai");
  }

  async generateWithTools(
    input: GenerateWithToolsInput,
  ): Promise<GenerateWithToolsResult> {
    const maxSteps = input.maxSteps ?? DEFAULT_MAX_STEPS;
    const systemPrompt = input.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
    const newMessages: LlmMessage[] = [];

    let history = input.messages.slice();
    for (let step = 0; step < maxSteps; step++) {
      const response = await this.callChatCompletions({
        messages: this.toOpenAiMessages(history),
        tools: input.tools.list(),
        systemPrompt,
      });

      const choice = response.choices?.[0];
      const msg = choice?.message;
      const assistantText = (msg?.content ?? "").toString();
      const toolCalls = (msg?.tool_calls ?? []) as any[];

      if (toolCalls.length === 0) {
        if (assistantText.trim().length > 0) {
          const m: LlmMessage = { role: "assistant", content: assistantText };
          newMessages.push(m);
          history = history.concat([m]);
        }
        return { outputText: assistantText, newMessages };
      }

      const assistantToolCalls = toolCalls.map((tc) => ({
        id: String(tc.id),
        name: String(tc.function?.name ?? ""),
        arguments: String(tc.function?.arguments ?? ""),
      }));

      const assistantMsg: LlmMessage = {
        role: "assistant",
        content: assistantText,
        toolCalls: assistantToolCalls,
      };
      newMessages.push(assistantMsg);
      history = history.concat([assistantMsg]);

      for (const tc of toolCalls) {
        const parsedArgs =
          OpenAiClient.safeJsonParse(tc.function?.arguments) ?? {};
        const call: ToolCall = {
          id: tc.id,
          name: tc.function?.name,
          arguments: parsedArgs,
        };
        const out = await input.tools.execute(call);
        const toolMsg: LlmMessage = {
          role: "tool",
          content: out,
          toolCallId: call.id,
          name: call.name,
        };
        newMessages.push(toolMsg);
        history = history.concat([toolMsg]);
      }
    }

    return {
      outputText: "Stopped (max steps reached).",
      newMessages,
    };
  }

  async streamWithTools(
    input: StreamWithToolsInput,
  ): Promise<StreamWithToolsResult> {
    const maxSteps = input.maxSteps ?? DEFAULT_MAX_STEPS;
    const systemPrompt = input.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
    const newMessages: LlmMessage[] = [];

    let history = input.messages.slice();
    for (let step = 0; step < maxSteps; step++) {
      const streamed = await this.callChatCompletionsStream({
        messages: this.toOpenAiMessages(history),
        tools: input.tools.list(),
        onText: input.onText,
        systemPrompt,
      });

      if (streamed.toolCalls.length === 0) {
        if (streamed.assistantText.trim().length > 0) {
          const m: LlmMessage = {
            role: "assistant",
            content: streamed.assistantText,
          };
          newMessages.push(m);
          history = history.concat([m]);
        }
        return { outputText: streamed.assistantText, newMessages };
      }

      const assistantMsg: LlmMessage = {
        role: "assistant",
        content: streamed.assistantText,
        toolCalls: streamed.toolCalls.map((tc) => ({
          id: tc.id,
          name: tc.name,
          arguments: tc.arguments,
        })),
      };
      newMessages.push(assistantMsg);
      history = history.concat([assistantMsg]);

      for (const tc of streamed.toolCalls) {
        const parsedArgs = OpenAiClient.safeJsonParse(tc.arguments) ?? {};
        const call: ToolCall = {
          id: tc.id,
          name: tc.name,
          arguments: parsedArgs,
        };
        const out = await input.tools.execute(call);
        const toolMsg: LlmMessage = {
          role: "tool",
          content: out,
          toolCallId: call.id,
          name: call.name,
        };
        newMessages.push(toolMsg);
        history = history.concat([toolMsg]);
      }
    }

    return { outputText: "Stopped (max steps reached).", newMessages };
  }

  private async callChatCompletions(input: {
    messages: OpenAiChatMessage[];
    tools: any[];
    systemPrompt: string;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: input.systemPrompt,
          },
          ...input.messages,
        ],
        tools: input.tools.map((t) => ({
          type: "function",
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
        })),
        tool_choice: input.tools.length > 0 ? "auto" : "none",
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(
        `OpenAI request failed: ${res.status} ${res.statusText}${txt ? `: ${txt}` : ""}`,
      );
    }
    return res.json();
  }

  private toOpenAiMessages(messages: LlmMessage[]): OpenAiChatMessage[] {
    return messages.map((m) => {
      if (m.role === "tool") {
        return {
          role: "tool",
          content: m.content,
          tool_call_id: m.toolCallId ?? "tool_call",
        };
      }
      if (m.role === "assistant" && m.toolCalls && m.toolCalls.length > 0) {
        return {
          role: "assistant",
          content: m.content,
          tool_calls: m.toolCalls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: { name: tc.name, arguments: tc.arguments },
          })),
        } as any;
      }
      return { role: m.role, content: m.content };
    });
  }

  private async callChatCompletionsStream(input: {
    messages: OpenAiChatMessage[];
    tools: any[];
    onText: (delta: string) => void;
    systemPrompt: string;
  }): Promise<{
    assistantText: string;
    toolCalls: { id: string; name: string; arguments: string }[];
  }> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        stream: true,
        messages: [
          {
            role: "system",
            content: input.systemPrompt,
          },
          ...input.messages,
        ],
        tools: input.tools.map((t) => ({
          type: "function",
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
        })),
        tool_choice: input.tools.length > 0 ? "auto" : "none",
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(
        `OpenAI request failed: ${res.status} ${res.statusText}${txt ? `: ${txt}` : ""}`,
      );
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("OpenAI stream missing body");

    const decoder = new TextDecoder();
    let buffer = "";
    let assistantText = "";
    const toolCallByIndex = new Map<
      number,
      { id: string; name: string; arguments: string }
    >();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const sep = buffer.indexOf("\n\n");
        if (sep < 0) break;
        const packet = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const lines = packet.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") {
            return {
              assistantText,
              toolCalls: Array.from(toolCallByIndex.entries())
                .sort((a, b) => a[0] - b[0])
                .map(([, v]) => v),
            };
          }
          const evt = OpenAiClient.safeJsonParse(data);
          if (!evt) continue;
          const choice = (evt as any).choices?.[0];
          const delta = choice?.delta;
          const contentDelta = delta?.content;
          if (typeof contentDelta === "string" && contentDelta.length > 0) {
            assistantText += contentDelta;
            input.onText(contentDelta);
          }
          const toolDeltas = delta?.tool_calls as any[] | undefined;
          if (Array.isArray(toolDeltas)) {
            for (const td of toolDeltas) {
              const idx = typeof td.index === "number" ? td.index : 0;
              const current = toolCallByIndex.get(idx) ?? {
                id: "",
                name: "",
                arguments: "",
              };
              if (typeof td.id === "string") current.id = td.id;
              const fn = td.function;
              if (typeof fn?.name === "string") current.name = fn.name;
              if (typeof fn?.arguments === "string")
                current.arguments += fn.arguments;
              toolCallByIndex.set(idx, current);
            }
          }
        }
      }
    }

    return {
      assistantText,
      toolCalls: Array.from(toolCallByIndex.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, v]) => v),
    };
  }

  private static safeJsonParse(text: unknown): Record<string, unknown> | null {
    if (typeof text !== "string") return null;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object") return parsed as any;
      return null;
    } catch {
      return null;
    }
  }
}
