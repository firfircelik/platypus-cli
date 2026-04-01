package providers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type AnthropicProvider struct {
	apiKey string
	model  string
}

func NewAnthropic(apiKey, model string) *AnthropicProvider {
	return &AnthropicProvider{apiKey: apiKey, model: model}
}

func (p *AnthropicProvider) Name() string {
	return "anthropic"
}

type anthropicMessage struct {
	Role    string                  `json:"role"`
	Content []anthropicContentBlock `json:"content"`
}

type anthropicContentBlock struct {
	Type      string                  `json:"type"`
	Text      string                  `json:"text,omitempty"`
	ID        string                  `json:"id,omitempty"`
	Name      string                  `json:"name,omitempty"`
	Input     map[string]any          `json:"input,omitempty"`
	ToolUseID string                  `json:"tool_use_id,omitempty"`
	IsError   bool                    `json:"is_error,omitempty"`
	Content   []anthropicContentBlock `json:"content,omitempty"`
}

type anthropicTool struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	InputSchema map[string]any `json:"input_schema"`
}

type anthropicRequest struct {
	Model     string             `json:"model"`
	MaxTokens int                `json:"max_tokens"`
	System    string             `json:"system"`
	Messages  []anthropicMessage `json:"messages"`
	Tools     []anthropicTool    `json:"tools,omitempty"`
}

type anthropicResponse struct {
	Content    []anthropicContentBlock `json:"content"`
	StopReason string                  `json:"stop_reason"`
	Usage      struct {
		InputTokens  int `json:"input_tokens"`
		OutputTokens int `json:"output_tokens"`
	} `json:"usage"`
}

const planModeSystemPrompt = `You are Platypus, an AI coding agent in PLAN MODE.

PLAN MODE RULES:
1. You MUST NOT make any edits, run any non-readonly tools, or otherwise make any changes to the system.
2. You may ONLY use read-only tools: Read, Grep, Glob, WebFetch, WebSearch, Tree, Git, Diff, Branch, Memory.
3. You may write/edit ONLY the plan file using the PlanMode tool.
4. Your goal is to explore the codebase, understand the problem, and write a detailed plan.
5. When finished, use the PlanMode tool with action "submit" to present your plan for approval.
6. End each turn with either a question for the user (via text) or a call to ExitPlanMode when ready.`

const normalSystemPrompt = `You are Platypus, an AI coding agent. READ before WRITE. VERIFY after CHANGE. NO explanations unless asked. NO comments in code unless explicitly requested. Be concise and efficient.`

func (p *AnthropicProvider) Chat(ctx context.Context, messages []Message, tools []ToolDef, planMode bool) (*Response, error) {
	systemPrompt := normalSystemPrompt
	if planMode {
		systemPrompt = planModeSystemPrompt
	}

	var anthropicMessages []anthropicMessage
	for _, msg := range messages {
		switch msg.Role {
		case "user":
			if msg.ToolUse != nil {
				anthropicMessages = append(anthropicMessages, anthropicMessage{
					Role: "user",
					Content: []anthropicContentBlock{{
						Type:      "tool_result",
						ToolUseID: msg.ToolUse.ID,
						Content:   []anthropicContentBlock{{Type: "text", Text: msg.Content}},
						IsError:   false,
					}},
				})
			} else {
				anthropicMessages = append(anthropicMessages, anthropicMessage{
					Role:    "user",
					Content: []anthropicContentBlock{{Type: "text", Text: msg.Content}},
				})
			}
		case "assistant":
			if msg.ToolUse != nil {
				anthropicMessages = append(anthropicMessages, anthropicMessage{
					Role: "assistant",
					Content: []anthropicContentBlock{{
						Type:  "tool_use",
						ID:    msg.ToolUse.ID,
						Name:  msg.ToolUse.Name,
						Input: msg.ToolUse.Input,
					}},
				})
			} else {
				anthropicMessages = append(anthropicMessages, anthropicMessage{
					Role:    "assistant",
					Content: []anthropicContentBlock{{Type: "text", Text: msg.Content}},
				})
			}
		}
	}

	var anthropicTools []anthropicTool
	for _, tool := range tools {
		anthropicTools = append(anthropicTools, anthropicTool{
			Name:        tool.Name,
			Description: tool.Description,
			InputSchema: tool.Parameters,
		})
	}

	reqBody := anthropicRequest{
		Model:     p.model,
		MaxTokens: 8192,
		System:    systemPrompt,
		Messages:  anthropicMessages,
		Tools:     anthropicTools,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", p.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("API request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}

	var apiResp anthropicResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	var responseMessages []Message
	for _, block := range apiResp.Content {
		switch block.Type {
		case "text":
			responseMessages = append(responseMessages, Message{
				Role:    "assistant",
				Content: block.Text,
			})
		case "tool_use":
			responseMessages = append(responseMessages, Message{
				Role: "assistant",
				ToolUse: &ToolUse{
					ID:    block.ID,
					Name:  block.Name,
					Input: block.Input,
				},
			})
		}
	}

	return &Response{
		Messages:   responseMessages,
		Usage:      Usage{InputTokens: apiResp.Usage.InputTokens, OutputTokens: apiResp.Usage.OutputTokens},
		StopReason: apiResp.StopReason,
	}, nil
}
