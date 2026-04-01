package providers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type OpenAIProvider struct {
	apiKey string
	model  string
}

func NewOpenAI(apiKey, model string) *OpenAIProvider {
	return &OpenAIProvider{apiKey: apiKey, model: model}
}

func (p *OpenAIProvider) Name() string {
	return "openai"
}

type openAIMessage struct {
	Role       string           `json:"role"`
	Content    string           `json:"content,omitempty"`
	ToolCalls  []openAIToolCall `json:"tool_calls,omitempty"`
	ToolCallID string           `json:"tool_call_id,omitempty"`
}

type openAIToolCall struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Function struct {
		Name      string `json:"name"`
		Arguments string `json:"arguments"`
	} `json:"function"`
}

type openAITool struct {
	Type     string `json:"type"`
	Function struct {
		Name        string         `json:"name"`
		Description string         `json:"description"`
		Parameters  map[string]any `json:"parameters"`
	} `json:"function"`
}

type openAIRequest struct {
	Model    string          `json:"model"`
	Messages []openAIMessage `json:"messages"`
	Tools    []openAITool    `json:"tools,omitempty"`
}

type openAIResponse struct {
	Choices []struct {
		Message      openAIMessage `json:"message"`
		FinishReason string        `json:"finish_reason"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
	} `json:"usage"`
}

func (p *OpenAIProvider) Chat(ctx context.Context, messages []Message, tools []ToolDef, planMode bool) (*Response, error) {
	systemPrompt := normalSystemPrompt
	if planMode {
		systemPrompt = planModeSystemPrompt
	}

	var openaiMessages []openAIMessage
	openaiMessages = append(openaiMessages, openAIMessage{
		Role:    "system",
		Content: systemPrompt,
	})

	for _, msg := range messages {
		switch msg.Role {
		case "user":
			if msg.ToolUse != nil {
				openaiMessages = append(openaiMessages, openAIMessage{
					Role:       "tool",
					Content:    msg.Content,
					ToolCallID: msg.ToolUse.ID,
				})
			} else {
				openaiMessages = append(openaiMessages, openAIMessage{
					Role:    "user",
					Content: msg.Content,
				})
			}
		case "assistant":
			if msg.ToolUse != nil {
				openaiMessages = append(openaiMessages, openAIMessage{
					Role: "assistant",
					ToolCalls: []openAIToolCall{{
						ID:   msg.ToolUse.ID,
						Type: "function",
					}},
				})
			} else {
				openaiMessages = append(openaiMessages, openAIMessage{
					Role:    "assistant",
					Content: msg.Content,
				})
			}
		}
	}

	var openaiTools []openAITool
	for _, tool := range tools {
		t := openAITool{Type: "function"}
		t.Function.Name = tool.Name
		t.Function.Description = tool.Description
		t.Function.Parameters = tool.Parameters
		openaiTools = append(openaiTools, t)
	}

	reqBody := openAIRequest{
		Model:    p.model,
		Messages: openaiMessages,
		Tools:    openaiTools,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/chat/completions", bytes.NewReader(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+p.apiKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("API request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}

	var apiResp openAIResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	var responseMessages []Message
	for _, choice := range apiResp.Choices {
		if choice.Message.Content != "" {
			responseMessages = append(responseMessages, Message{
				Role:    "assistant",
				Content: choice.Message.Content,
			})
		}
		for _, toolCall := range choice.Message.ToolCalls {
			responseMessages = append(responseMessages, Message{
				Role: "assistant",
				ToolUse: &ToolUse{
					ID:   toolCall.ID,
					Name: toolCall.Function.Name,
				},
			})
		}
	}

	return &Response{
		Messages:   responseMessages,
		Usage:      Usage{InputTokens: apiResp.Usage.PromptTokens, OutputTokens: apiResp.Usage.CompletionTokens},
		StopReason: apiResp.Choices[0].FinishReason,
	}, nil
}
