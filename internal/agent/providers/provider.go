package providers

import "context"

type Message struct {
	Role    string
	Content string
	ToolUse *ToolUse
}

type ToolUse struct {
	ID    string
	Name  string
	Input map[string]any
}

type Response struct {
	Messages   []Message
	Usage      Usage
	StopReason string
}

type Usage struct {
	InputTokens  int
	OutputTokens int
}

type ToolDef struct {
	Name        string
	Description string
	Parameters  map[string]any
}

type Provider interface {
	Chat(ctx context.Context, messages []Message, tools []ToolDef, planMode bool) (*Response, error)
	Name() string
}
