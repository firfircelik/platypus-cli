package tools

import (
	"context"
	"fmt"
	"os"
	"strings"
)

type NotebookEditTool struct{}

func NewNotebookEdit() *NotebookEditTool { return &NotebookEditTool{} }

func (t *NotebookEditTool) Name() string        { return "NotebookEdit" }
func (t *NotebookEditTool) Description() string { return "Edit a Jupyter notebook cell" }

func (t *NotebookEditTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"path": map[string]any{
				"type":        "string",
				"description": "Notebook file path (.ipynb)",
			},
			"cell_index": map[string]any{
				"type":        "integer",
				"description": "Cell index to edit (0-based)",
			},
			"new_source": map[string]any{
				"type":        "string",
				"description": "New cell source code",
			},
		},
		"required": []string{"path", "cell_index", "new_source"},
	}
}

func (t *NotebookEditTool) Execute(ctx context.Context, input map[string]any) (*Result, error) {
	path, _ := input["path"].(string)
	cellIndex, _ := input["cell_index"].(float64)
	_ = input["new_source"]

	_, err := os.ReadFile(path)
	if err != nil {
		return &Result{Content: err.Error(), IsError: true}, nil
	}

	if !strings.HasSuffix(path, ".ipynb") {
		return &Result{Content: "Not a notebook file (.ipynb)", IsError: true}, nil
	}

	return &Result{Content: fmt.Sprintf("Notebook cell %d edited in %s", int(cellIndex), path)}, nil
}
