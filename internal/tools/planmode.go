package tools

import (
	"context"
	"fmt"
	"os"
	"strings"
)

type EnterPlanModeTool struct{}

func NewEnterPlanMode() *EnterPlanModeTool { return &EnterPlanModeTool{} }

func (t *EnterPlanModeTool) Name() string { return "EnterPlanMode" }
func (t *EnterPlanModeTool) Description() string {
	return "Enter plan mode for read-only exploration and planning"
}

func (t *EnterPlanModeTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"reason": map[string]any{
				"type":        "string",
				"description": "Reason for entering plan mode",
			},
		},
		"required": []string{},
	}
}

func (t *EnterPlanModeTool) Execute(ctx context.Context, input map[string]any) (*Result, error) {
	reason, _ := input["reason"].(string)
	if reason == "" {
		reason = "Complex task requires planning"
	}
	return &Result{
		Content: fmt.Sprintf("Plan mode entered. Reason: %s\n\nYou are now in read-only mode. You may:\n- Read files (Read, Grep, Glob, Tree, Git, Diff)\n- Search the web (WebFetch, WebSearch)\n- Write the plan file using the PlanMode tool\n\nYou MUST NOT:\n- Edit any files (except the plan file)\n- Run bash commands that modify files\n- Make any system changes\n\nWhen your plan is ready, use ExitPlanMode to submit for approval.", reason),
	}, nil
}

type ExitPlanModeTool struct{}

func NewExitPlanMode() *ExitPlanModeTool { return &ExitPlanModeTool{} }

func (t *ExitPlanModeTool) Name() string { return "ExitPlanMode" }
func (t *ExitPlanModeTool) Description() string {
	return "Exit plan mode and submit plan for user approval"
}

func (t *ExitPlanModeTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"plan_summary": map[string]any{
				"type":        "string",
				"description": "Brief summary of the plan",
			},
		},
		"required": []string{"plan_summary"},
	}
}

func (t *ExitPlanModeTool) Execute(ctx context.Context, input map[string]any) (*Result, error) {
	summary, _ := input["plan_summary"].(string)
	return &Result{
		Content: fmt.Sprintf("Plan submitted for approval.\n\nSummary: %s\n\nThe user will now review your plan. They can:\n- Approve and proceed with implementation\n- Request changes with feedback\n- Ask you to continue planning", summary),
	}, nil
}

type PlanModeTool struct {
	planFile string
}

func NewPlanMode() *PlanModeTool { return &PlanModeTool{} }

func (t *PlanModeTool) Name() string { return "PlanMode" }
func (t *PlanModeTool) Description() string {
	return "Create, update, and manage the plan file during plan mode"
}

func (t *PlanModeTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"action": map[string]any{
				"type":        "string",
				"enum":        []string{"write", "append", "read", "submit"},
				"description": "Action to perform on the plan file",
			},
			"content": map[string]any{
				"type":        "string",
				"description": "Content to write/append (for write/append actions)",
			},
		},
		"required": []string{"action"},
	}
}

func (t *PlanModeTool) Execute(ctx context.Context, input map[string]any) (*Result, error) {
	action, _ := input["action"].(string)

	switch action {
	case "write":
		content, _ := input["content"].(string)
		if content == "" {
			return &Result{Content: "Missing content for write action", IsError: true}, nil
		}
		t.planFile = content
		return &Result{Content: fmt.Sprintf("Plan file written (%d bytes). This is the ONLY file you can modify in plan mode.", len(content))}, nil

	case "append":
		content, _ := input["content"].(string)
		if content == "" {
			return &Result{Content: "Missing content for append action", IsError: true}, nil
		}
		t.planFile += "\n" + content
		return &Result{Content: fmt.Sprintf("Content appended to plan file (%d bytes total).", len(t.planFile))}, nil

	case "read":
		if t.planFile == "" {
			return &Result{Content: "Plan file is empty. Use 'write' action to create it."}, nil
		}
		return &Result{Content: t.planFile}, nil

	case "submit":
		if t.planFile == "" {
			return &Result{Content: "Cannot submit: plan file is empty. Write your plan first.", IsError: true}, nil
		}

		lines := strings.Count(t.planFile, "\n") + 1
		return &Result{
			Content: fmt.Sprintf("Plan submitted (%d lines, %d bytes).\n\nUse ExitPlanMode to present the plan to the user for approval.\n\n--- PLAN START ---\n%s\n--- PLAN END ---", lines, len(t.planFile), t.planFile),
		}, nil

	default:
		return &Result{Content: "Unknown action: " + action + ". Valid actions: write, append, read, submit", IsError: true}, nil
	}
}

type ConfigTool struct{}

func NewConfig() *ConfigTool { return &ConfigTool{} }

func (t *ConfigTool) Name() string        { return "Config" }
func (t *ConfigTool) Description() string { return "Read configuration settings" }

func (t *ConfigTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"key": map[string]any{
				"type":        "string",
				"description": "Configuration key to read",
			},
		},
		"required": []string{},
	}
}

func (t *ConfigTool) Execute(ctx context.Context, input map[string]any) (*Result, error) {
	key, _ := input["key"].(string)
	if key == "" {
		return &Result{Content: "Usage: Config tool with key parameter"}, nil
	}

	val := os.Getenv(key)
	if val == "" {
		return &Result{Content: fmt.Sprintf("Config '%s' not found in environment", key)}, nil
	}

	return &Result{Content: fmt.Sprintf("%s=%s", key, val)}, nil
}
