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

type AnthropicMessage = { role: "user" | "assistant"; content: string | any[] };

export class AnthropicClient implements LlmClient {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(
    apiKey: string,
    model: string,
    baseUrl: string = "https://api.anthropic.com/v1",
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl;
  }

  static async create(model?: string): Promise<AnthropicClient> {
    const envKey = process.env.ANTHROPIC_API_KEY;
    const apiKey =
      envKey && envKey.trim().length > 0
        ? envKey.trim()
        : await AnthropicClient.loadFromKeyStore();
    const m =
      model ??
      process.env.ANTHROPIC_MODEL ??
      process.env.PLATYPUS_MODEL ??
      "claude-3-5-sonnet-20241022";
    return new AnthropicClient(apiKey, m);
  }

  private static async loadFromKeyStore(): Promise<string> {
    const ks = new KeyStore();
    await ks.initialize();
    return ks.getKey("anthropic");
  }

  async generateWithTools(
    input: GenerateWithToolsInput,
  ): Promise<GenerateWithToolsResult> {
    const maxSteps = input.maxSteps ?? DEFAULT_MAX_STEPS;
    const systemPrompt = input.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
    const newMessages: LlmMessage[] = [];

    let history = input.messages.slice();
    for (let step = 0; step < maxSteps; step++) {
      const response = await this.callMessages({
        messages: this.toAnthropicMessages(history),
        tools: input.tools.list(),
        systemPrompt,
      });

      const assistantText = AnthropicClient.extractText(response.content);
      const toolCalls = AnthropicClient.extractToolUses(response.content);

      if (toolCalls.length === 0) {
        if (assistantText.trim().length > 0) {
          const m: LlmMessage = { role: "assistant", content: assistantText };
          newMessages.push(m);
          history = history.concat([m]);
        }
        return { outputText: assistantText, newMessages };
      }

      const assistantMsg: LlmMessage = {
        role: "assistant",
        content: assistantText,
        toolCalls: toolCalls.map((tc) => ({
          id: tc.id,
          name: tc.name,
          arguments: tc.arguments,
        })),
      };
      newMessages.push(assistantMsg);
      history = history.concat([assistantMsg]);

      for (const tc of toolCalls) {
        const parsedArgs = AnthropicClient.safeJsonParse(tc.arguments) ?? {};
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

  async streamWithTools(
    input: StreamWithToolsInput,
  ): Promise<StreamWithToolsResult> {
    const maxSteps = input.maxSteps ?? DEFAULT_MAX_STEPS;
    const systemPrompt = input.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
    const newMessages: LlmMessage[] = [];

    let history = input.messages.slice();
    for (let step = 0; step < maxSteps; step++) {
      const streamed = await this.callMessagesStream({
        messages: this.toAnthropicMessages(history),
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
        const parsedArgs = AnthropicClient.safeJsonParse(tc.arguments) ?? {};
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

  private async callMessages(input: {
    messages: AnthropicMessage[];
    tools: any[];
    systemPrompt: string;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        system: input.systemPrompt,
        messages: input.messages,
        tools: input.tools.map((t) => ({
          name: t.name,
          description: t.description,
          input_schema: t.parameters,
        })),
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(
        `Anthropic request failed: ${res.status} ${res.statusText}${txt ? `: ${txt}` : ""}`,
      );
    }
    return res.json();
  }

  private async callMessagesStream(input: {
    messages: AnthropicMessage[];
    tools: any[];
    onText: (delta: string) => void;
    systemPrompt: string;
  }): Promise<{
    assistantText: string;
    toolCalls: { id: string; name: string; arguments: string }[];
  }> {
    const res = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        stream: true,
        system: input.systemPrompt,
        messages: input.messages,
        tools: input.tools.map((t: any) => ({
          name: t.name,
          description: t.description,
          input_schema: t.parameters,
        })),
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(
        `Anthropic request failed: ${res.status} ${res.statusText}${txt ? `: ${txt}` : ""}`,
      );
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("Anthropic stream missing body");

    const decoder = new TextDecoder();
    let buffer = "";
    let assistantText = "";
    const toolCalls: { id: string; name: string; arguments: string }[] = [];
    let currentToolIndex = -1;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const sep = buffer.indexOf("\n\n");
        if (sep < 0) break;
        const packet = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);

        let eventType = "";
        let eventData = "";
        for (const line of packet.split("\n")) {
          if (line.startsWith("event:")) eventType = line.slice(6).trim();
          else if (line.startsWith("data:")) eventData = line.slice(5).trim();
        }

        if (
          eventType === "message_stop" ||
          eventType === "message_delta" ||
          !eventData
        )
          continue;

        const evt = AnthropicClient.safeJsonParse(eventData);
        if (!evt) continue;

        if (eventType === "content_block_start") {
          const block = (evt as any).content_block;
          if (block?.type === "tool_use") {
            currentToolIndex = toolCalls.length;
            toolCalls.push({
              id: String(block.id ?? ""),
              name: String(block.name ?? ""),
              arguments: "",
            });
          } else if (block?.type === "text") {
            currentToolIndex = -1;
          }
        } else if (eventType === "content_block_delta") {
          const delta = (evt as any).delta;
          if (delta?.type === "text_delta" && typeof delta.text === "string") {
            assistantText += delta.text;
            input.onText(delta.text);
          } else if (
            delta?.type === "input_json_delta" &&
            typeof delta.partial_json === "string"
          ) {
            if (currentToolIndex >= 0 && currentToolIndex < toolCalls.length) {
              toolCalls[currentToolIndex].arguments += delta.partial_json;
            }
          }
        }
      }
    }

    return { assistantText, toolCalls };
  }

  private toAnthropicMessages(messages: LlmMessage[]): AnthropicMessage[] {
    const out: AnthropicMessage[] = [];
    for (const m of messages) {
      if (m.role === "user") {
        out.push({ role: "user", content: m.content });
        continue;
      }
      if (m.role === "assistant") {
        if (m.toolCalls && m.toolCalls.length > 0) {
          const blocks: any[] = [];
          if (m.content.trim().length > 0)
            blocks.push({ type: "text", text: m.content });
          for (const tc of m.toolCalls) {
            const parsed = AnthropicClient.safeJsonParse(tc.arguments) ?? {};
            blocks.push({
              type: "tool_use",
              id: tc.id,
              name: tc.name,
              input: parsed,
            });
          }
          out.push({ role: "assistant", content: blocks });
          continue;
        }
        out.push({ role: "assistant", content: m.content });
        continue;
      }
      const toolId = m.toolCallId ?? "tool_call";
      out.push({
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: toolId, content: m.content },
        ],
      });
    }
    return out;
  }

  private static extractText(content: any): string {
    if (!Array.isArray(content)) return "";
    return content
      .filter((b: any) => b?.type === "text" && typeof b.text === "string")
      .map((b: any) => b.text)
      .join("");
  }

  private static extractToolUses(
    content: any,
  ): { id: string; name: string; arguments: string }[] {
    if (!Array.isArray(content)) return [];
    return content
      .filter((b: any) => b?.type === "tool_use" && typeof b.name === "string")
      .map((b: any) => ({
        id: String(b.id ?? `${b.name}-call`),
        name: String(b.name),
        arguments: JSON.stringify(b.input ?? {}),
      }));
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
