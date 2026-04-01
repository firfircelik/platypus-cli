package tools

import (
	"context"
	"fmt"
)

type TodoWriteTool struct {
	todos []TodoItem
}

type TodoItem struct {
	Status  string `json:"status"`
	Content string `json:"content"`
}

func NewTodoWrite() *TodoWriteTool { return &TodoWriteTool{} }

func (t *TodoWriteTool) Name() string { return "TodoWrite" }
func (t *TodoWriteTool) Description() string {
	return "Create and manage a todo list for the current task"
}

func (t *TodoWriteTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"todos": map[string]any{
				"type": "array",
				"items": map[string]any{
					"type": "object",
					"properties": map[string]any{
						"status": map[string]any{
							"type":        "string",
							"enum":        []string{"pending", "in_progress", "completed"},
							"description": "Current status of the todo",
						},
						"content": map[string]any{
							"type":        "string",
							"description": "The todo content",
						},
					},
					"required": []string{"status", "content"},
				},
				"description": "The updated todo list",
			},
		},
		"required": []string{"todos"},
	}
}

func (t *TodoWriteTool) Execute(ctx context.Context, input map[string]any) (*Result, error) {
	todosRaw, ok := input["todos"].([]any)
	if !ok {
		return &Result{Content: "Missing or invalid todos parameter", IsError: true}, nil
	}

	t.todos = nil
	for _, item := range todosRaw {
		itemMap, ok := item.(map[string]any)
		if !ok {
			continue
		}
		status, _ := itemMap["status"].(string)
		content, _ := itemMap["content"].(string)
		t.todos = append(t.todos, TodoItem{Status: status, Content: content})
	}

	var summary string
	for _, todo := range t.todos {
		icon := "○"
		switch todo.Status {
		case "in_progress":
			icon = "◐"
		case "completed":
			icon = "✓"
		}
		summary += fmt.Sprintf("%s %s\n", icon, todo.Content)
	}

	return &Result{Content: "Todo list updated:\n" + summary}, nil
}
