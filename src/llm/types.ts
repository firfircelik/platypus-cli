export type LlmRole = "user" | "assistant" | "tool";

export const LLM_ROLES: readonly LlmRole[] = ["user", "assistant", "tool"];

export type LlmMessage = {
  role: LlmRole;
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: { id: string; name: string; arguments: string }[];
};

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type ToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type ToolRegistry = {
  list(): ToolDefinition[];
  execute(call: ToolCall): Promise<string>;
};

/** Default maximum tool-call steps per LLM invocation. */
export const DEFAULT_MAX_STEPS = 50;

export type GenerateWithToolsInput = {
  messages: LlmMessage[];
  tools: ToolRegistry;
  maxSteps?: number;
  systemPrompt?: string;
};

export type GenerateWithToolsResult = {
  outputText: string;
  newMessages: LlmMessage[];
};

export type StreamWithToolsInput = GenerateWithToolsInput & {
  onText: (delta: string) => void;
};

export type StreamWithToolsResult = GenerateWithToolsResult;
