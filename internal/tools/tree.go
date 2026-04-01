package tools

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
)

type TreeTool struct{}

func NewTree() *TreeTool { return &TreeTool{} }

func (t *TreeTool) Name() string        { return "Tree" }
func (t *TreeTool) Description() string { return "List directory structure as a tree" }

func (t *TreeTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"path": map[string]any{
				"type":        "string",
				"description": "Directory path to list",
			},
		},
		"required": []string{"path"},
	}
}

func (t *TreeTool) Execute(ctx context.Context, input map[string]any) (*Result, error) {
	path, _ := input["path"].(string)
	if path == "" {
		path = "."
	}

	var result string
	err := filepath.Walk(path, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}

		rel, _ := filepath.Rel(path, path)
		prefix := ""
		if info.IsDir() {
			prefix = "📁 "
		} else {
			prefix = "📄 "
		}

		result += fmt.Sprintf("%s%s\n", prefix, rel)
		return nil
	})

	if err != nil {
		return &Result{Content: err.Error(), IsError: true}, nil
	}

	return &Result{Content: result}, nil
}
