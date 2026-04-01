package tools

import (
	"context"
	"os/exec"
)

type BashTool struct{}

func NewBash() *BashTool { return &BashTool{} }

func (t *BashTool) Name() string        { return "Bash" }
func (t *BashTool) Description() string { return "Execute a shell command" }

func (t *BashTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"command": map[string]any{
				"type":        "string",
				"description": "The shell command to execute",
			},
		},
		"required": []string{"command"},
	}
}

func (t *BashTool) Execute(ctx context.Context, input map[string]any) (*Result, error) {
	cmd, ok := input["command"].(string)
	if !ok {
		return &Result{Content: "Missing command parameter", IsError: true}, nil
	}

	c := exec.CommandContext(ctx, "bash", "-c", cmd)
	output, err := c.CombinedOutput()

	result := &Result{
		Content: string(output),
		IsError: err != nil,
	}

	if len(result.Content) > 50000 {
		result.Content = result.Content[:50000] + "\n... (output truncated)"
	}

	return result, nil
}
