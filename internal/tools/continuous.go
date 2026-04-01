package tools

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type ContinuousRunTool struct {
	running bool
	cmd     *exec.Cmd
}

func NewContinuousRun() *ContinuousRunTool { return &ContinuousRunTool{} }

func (t *ContinuousRunTool) Name() string { return "ContinuousRun" }
func (t *ContinuousRunTool) Description() string {
	return "Run a command continuously with file watch triggers"
}

func (t *ContinuousRunTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"action": map[string]any{
				"type":        "string",
				"enum":        []string{"start", "stop", "status"},
				"description": "Action to perform",
			},
			"command": map[string]any{
				"type":        "string",
				"description": "Command to run continuously",
			},
			"watch": map[string]any{
				"type":        "string",
				"description": "File patterns to watch (comma-separated)",
			},
			"interval": map[string]any{
				"type":        "integer",
				"description": "Check interval in seconds",
			},
		},
		"required": []string{"action"},
	}
}

func (t *ContinuousRunTool) Execute(ctx context.Context, input map[string]any) (*Result, error) {
	action, _ := input["action"].(string)

	switch action {
	case "start":
		return t.start(input)
	case "stop":
		return t.stop()
	case "status":
		return t.status()
	default:
		return &Result{Content: "Unknown action: " + action, IsError: true}, nil
	}
}

func (t *ContinuousRunTool) start(input map[string]any) (*Result, error) {
	command, _ := input["command"].(string)
	if command == "" {
		return &Result{Content: "Missing command parameter", IsError: true}, nil
	}

	watch, _ := input["watch"].(string)
	intervalSec, _ := input["interval"].(float64)
	if intervalSec == 0 {
		intervalSec = 5
	}

	if t.running {
		return &Result{Content: "Continuous run already active. Stop it first.", IsError: true}, nil
	}

	t.running = true

	go func() {
		for t.running {
			if watch != "" {
				patterns := strings.Split(watch, ",")
				changed := false
				for _, pattern := range patterns {
					pattern = strings.TrimSpace(pattern)
					matches, _ := filepath.Glob(pattern)
					for _, m := range matches {
						info, err := os.Stat(m)
						if err == nil && info.ModTime().After(time.Now().Add(-time.Duration(intervalSec)*time.Second)) {
							changed = true
							break
						}
					}
					if changed {
						break
					}
				}
				if !changed {
					time.Sleep(time.Duration(intervalSec) * time.Second)
					continue
				}
			}

			cmd := exec.Command("bash", "-c", command)
			cmd.Dir, _ = os.Getwd()
			output, _ := cmd.CombinedOutput()
			_ = output

			time.Sleep(time.Duration(intervalSec) * time.Second)
		}
	}()

	return &Result{
		Content: fmt.Sprintf("Continuous run started.\nCommand: %s\nWatch: %s\nInterval: %.0fs", command, watch, intervalSec),
	}, nil
}

func (t *ContinuousRunTool) stop() (*Result, error) {
	if !t.running {
		return &Result{Content: "Continuous run not active"}, nil
	}

	t.running = false
	if t.cmd != nil && t.cmd.Process != nil {
		t.cmd.Process.Kill()
	}

	return &Result{Content: "Continuous run stopped"}, nil
}

func (t *ContinuousRunTool) status() (*Result, error) {
	status := "stopped"
	if t.running {
		status = "running"
	}
	return &Result{Content: fmt.Sprintf("Continuous run status: %s", status)}, nil
}
