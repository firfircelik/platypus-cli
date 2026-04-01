package tools

import (
	"context"
	"os"
	"path/filepath"
	"strings"
)

type FileReadTool struct{}

func NewFileRead() *FileReadTool { return &FileReadTool{} }

func (t *FileReadTool) Name() string        { return "Read" }
func (t *FileReadTool) Description() string { return "Read a file's contents" }

func (t *FileReadTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"path": map[string]any{
				"type":        "string",
				"description": "File path to read",
			},
		},
		"required": []string{"path"},
	}
}

func (t *FileReadTool) Execute(ctx context.Context, input map[string]any) (*Result, error) {
	path, _ := input["path"].(string)

	content, err := os.ReadFile(path)
	if err != nil {
		return &Result{Content: err.Error(), IsError: true}, nil
	}

	result := string(content)
	if len(result) > 50000 {
		result = result[:50000] + "\n... (file truncated, use grep to find specific content)"
	}

	return &Result{Content: result}, nil
}

type FileWriteTool struct{}

func NewFileWrite() *FileWriteTool { return &FileWriteTool{} }

func (t *FileWriteTool) Name() string        { return "Write" }
func (t *FileWriteTool) Description() string { return "Write content to a file" }

func (t *FileWriteTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"path":    map[string]any{"type": "string", "description": "File path"},
			"content": map[string]any{"type": "string", "description": "File content"},
		},
		"required": []string{"path", "content"},
	}
}

func (t *FileWriteTool) Execute(ctx context.Context, input map[string]any) (*Result, error) {
	path, _ := input["path"].(string)
	content, _ := input["content"].(string)

	os.MkdirAll(filepath.Dir(path), 0755)

	err := os.WriteFile(path, []byte(content), 0644)
	if err != nil {
		return &Result{Content: err.Error(), IsError: true}, nil
	}

	return &Result{Content: "File written: " + path}, nil
}

type FileEditTool struct{}

func NewFileEdit() *FileEditTool { return &FileEditTool{} }

func (t *FileEditTool) Name() string        { return "Edit" }
func (t *FileEditTool) Description() string { return "Apply a search/replace edit to a file" }

func (t *FileEditTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"path":       map[string]any{"type": "string", "description": "File path"},
			"old_string": map[string]any{"type": "string", "description": "Text to replace"},
			"new_string": map[string]any{"type": "string", "description": "Replacement text"},
		},
		"required": []string{"path", "old_string", "new_string"},
	}
}

func (t *FileEditTool) Execute(ctx context.Context, input map[string]any) (*Result, error) {
	path, _ := input["path"].(string)
	oldStr, _ := input["old_string"].(string)
	newStr, _ := input["new_string"].(string)

	content, err := os.ReadFile(path)
	if err != nil {
		return &Result{Content: err.Error(), IsError: true}, nil
	}

	if !strings.Contains(string(content), oldStr) {
		return &Result{Content: "old_string not found in file", IsError: true}, nil
	}

	newContent := strings.Replace(string(content), oldStr, newStr, 1)
	err = os.WriteFile(path, []byte(newContent), 0644)
	if err != nil {
		return &Result{Content: err.Error(), IsError: true}, nil
	}

	return &Result{Content: "File edited: " + path}, nil
}
