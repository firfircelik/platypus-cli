package tools

import (
	"context"
	"path/filepath"
	"strings"
)

type GlobTool struct{}

func NewGlob() *GlobTool { return &GlobTool{} }

func (t *GlobTool) Name() string        { return "Glob" }
func (t *GlobTool) Description() string { return "Find files matching a glob pattern" }

func (t *GlobTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"pattern": map[string]any{
				"type":        "string",
				"description": "Glob pattern (e.g. *.go, **/*.ts)",
			},
		},
		"required": []string{"pattern"},
	}
}

func (t *GlobTool) Execute(ctx context.Context, input map[string]any) (*Result, error) {
	pattern, _ := input["pattern"].(string)

	matches, err := filepath.Glob(pattern)
	if err != nil {
		return &Result{Content: "Invalid glob pattern: " + err.Error(), IsError: true}, nil
	}

	if len(matches) == 0 {
		return &Result{Content: "No files matched"}, nil
	}

	result := strings.Join(matches, "\n")
	return &Result{Content: result}, nil
}
