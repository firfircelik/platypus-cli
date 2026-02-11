import type { GenerateWithToolsInput, GenerateWithToolsResult, StreamWithToolsInput, StreamWithToolsResult } from './types.js'

export type LlmClient = {
  generateWithTools(input: GenerateWithToolsInput): Promise<GenerateWithToolsResult>
  streamWithTools?(input: StreamWithToolsInput): Promise<StreamWithToolsResult>
}

export function asLlmClient(client: LlmClient): LlmClient {
  return client
}
