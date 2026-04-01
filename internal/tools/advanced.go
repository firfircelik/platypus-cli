package tools

import (
	"context"
	"fmt"
	"os"
	"strings"
)

type CronTool struct {
	jobs []CronJob
}

type CronJob struct {
	Schedule string
	Command  string
	Enabled  bool
}

func NewCron() *CronTool { return &CronTool{} }

func (t *CronTool) Name() string        { return "Cron" }
func (t *CronTool) Description() string { return "Schedule recurring tasks" }

func (t *CronTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"action": map[string]any{
				"type":        "string",
				"enum":        []string{"create", "list", "delete", "pause", "resume"},
				"description": "Cron action",
			},
			"schedule": map[string]any{
				"type":        "string",
				"description": "Cron schedule (e.g., '0 9 * * *')",
			},
			"command": map[string]any{
				"type":        "string",
				"description": "Command to execute",
			},
			"id": map[string]any{
				"type":        "integer",
				"description": "Job ID (for delete/pause/resume)",
			},
		},
		"required": []string{"action"},
	}
}

func (t *CronTool) Execute(ctx context.Context, input map[string]any) (*Result, error) {
	action, _ := input["action"].(string)

	switch action {
	case "create":
		schedule, _ := input["schedule"].(string)
		command, _ := input["command"].(string)
		t.jobs = append(t.jobs, CronJob{
			Schedule: schedule,
			Command:  command,
			Enabled:  true,
		})
		return &Result{Content: fmt.Sprintf("Cron job created: %s -> %s", schedule, command)}, nil

	case "list":
		if len(t.jobs) == 0 {
			return &Result{Content: "No cron jobs scheduled"}, nil
		}
		var sb strings.Builder
		for i, job := range t.jobs {
			status := "enabled"
			if !job.Enabled {
				status = "paused"
			}
			sb.WriteString(fmt.Sprintf("%d. [%s] %s -> %s\n", i, status, job.Schedule, job.Command))
		}
		return &Result{Content: sb.String()}, nil

	case "delete":
		id, _ := input["id"].(float64)
		if int(id) >= len(t.jobs) {
			return &Result{Content: "Job not found", IsError: true}, nil
		}
		t.jobs = append(t.jobs[:int(id)], t.jobs[int(id)+1:]...)
		return &Result{Content: "Job deleted"}, nil

	case "pause":
		id, _ := input["id"].(float64)
		if int(id) >= len(t.jobs) {
			return &Result{Content: "Job not found", IsError: true}, nil
		}
		t.jobs[int(id)].Enabled = false
		return &Result{Content: "Job paused"}, nil

	case "resume":
		id, _ := input["id"].(float64)
		if int(id) >= len(t.jobs) {
			return &Result{Content: "Job not found", IsError: true}, nil
		}
		t.jobs[int(id)].Enabled = true
		return &Result{Content: "Job resumed"}, nil

	default:
		return &Result{Content: "Unknown action: " + action, IsError: true}, nil
	}
}

type MemoryTool struct {
	memories map[string]string
}

func NewMemory() *MemoryTool {
	return &MemoryTool{memories: make(map[string]string)}
}

func (t *MemoryTool) Name() string        { return "Memory" }
func (t *MemoryTool) Description() string { return "Store and retrieve persistent memories" }

func (t *MemoryTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"action": map[string]any{
				"type":        "string",
				"enum":        []string{"save", "load", "list", "delete", "clear"},
				"description": "Memory action",
			},
			"key": map[string]any{
				"type":        "string",
				"description": "Memory key",
			},
			"value": map[string]any{
				"type":        "string",
				"description": "Memory value (for save)",
			},
		},
		"required": []string{"action"},
	}
}

func (t *MemoryTool) Execute(ctx context.Context, input map[string]any) (*Result, error) {
	action, _ := input["action"].(string)

	switch action {
	case "save":
		key, _ := input["key"].(string)
		value, _ := input["value"].(string)
		if key == "" {
			return &Result{Content: "Missing key", IsError: true}, nil
		}
		t.memories[key] = value
		return &Result{Content: fmt.Sprintf("Memory saved: %s", key)}, nil

	case "load":
		key, _ := input["key"].(string)
		if val, ok := t.memories[key]; ok {
			return &Result{Content: val}, nil
		}
		return &Result{Content: "Memory not found: " + key, IsError: true}, nil

	case "list":
		if len(t.memories) == 0 {
			return &Result{Content: "No memories stored"}, nil
		}
		var sb strings.Builder
		for k := range t.memories {
			sb.WriteString("- " + k + "\n")
		}
		return &Result{Content: sb.String()}, nil

	case "delete":
		key, _ := input["key"].(string)
		delete(t.memories, key)
		return &Result{Content: "Memory deleted: " + key}, nil

	case "clear":
		t.memories = make(map[string]string)
		return &Result{Content: "All memories cleared"}, nil

	default:
		return &Result{Content: "Unknown action: " + action, IsError: true}, nil
	}
}

func LoadMemoryFromFile(path string) map[string]string {
	memories := make(map[string]string)
	data, err := os.ReadFile(path)
	if err != nil {
		return memories
	}

	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		if idx := strings.Index(line, "="); idx > 0 {
			key := strings.TrimSpace(line[:idx])
			value := strings.TrimSpace(line[idx+1:])
			if key != "" {
				memories[key] = value
			}
		}
	}

	return memories
}

func SaveMemoryToFile(path string, memories map[string]string) error {
	var sb strings.Builder
	for k, v := range memories {
		sb.WriteString(k + "=" + v + "\n")
	}
	return os.WriteFile(path, []byte(sb.String()), 0644)
}
