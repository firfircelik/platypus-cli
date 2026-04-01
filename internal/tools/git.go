package tools

import (
	"context"
	"os/exec"
	"strings"
)

type GitTool struct{}

func NewGit() *GitTool { return &GitTool{} }

func (t *GitTool) Name() string        { return "Git" }
func (t *GitTool) Description() string { return "Execute git commands" }

func (t *GitTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"command": map[string]any{
				"type":        "string",
				"description": "Git command (e.g., status, diff, log)",
			},
		},
		"required": []string{"command"},
	}
}

func (t *GitTool) Execute(ctx context.Context, input map[string]any) (*Result, error) {
	cmd, _ := input["command"].(string)
	if cmd == "" {
		return &Result{Content: "Missing command parameter", IsError: true}, nil
	}

	allowedCommands := map[string]bool{
		"status": true,
		"diff":   true,
		"log":    true,
		"branch": true,
		"show":   true,
		"blame":  true,
		"remote": true,
		"tag":    true,
		"stash":  true,
	}

	parts := strings.Fields(cmd)
	if len(parts) == 0 {
		return &Result{Content: "Empty command", IsError: true}, nil
	}

	if !allowedCommands[parts[0]] {
		return &Result{Content: "Command not allowed. Allowed: status, diff, log, branch, show, blame, remote, tag, stash", IsError: true}, nil
	}

	c := exec.CommandContext(ctx, "git", strings.Fields(cmd)...)
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

type DiffTool struct{}

func NewDiff() *DiffTool { return &DiffTool{} }

func (t *DiffTool) Name() string        { return "Diff" }
func (t *DiffTool) Description() string { return "Show diff between files or commits" }

func (t *DiffTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"target": map[string]any{
				"type":        "string",
				"description": "Diff target (e.g., HEAD, branch name, file path)",
			},
		},
		"required": []string{},
	}
}

func (t *DiffTool) Execute(ctx context.Context, input map[string]any) (*Result, error) {
	target, _ := input["target"].(string)
	if target == "" {
		target = "HEAD"
	}

	c := exec.CommandContext(ctx, "git", "diff", target)
	output, err := c.CombinedOutput()

	result := &Result{
		Content: string(output),
		IsError: err != nil,
	}

	if len(result.Content) > 50000 {
		result.Content = result.Content[:50000] + "\n... (diff truncated)"
	}

	return result, nil
}

type BranchTool struct{}

func NewBranch() *BranchTool { return &BranchTool{} }

func (t *BranchTool) Name() string        { return "Branch" }
func (t *BranchTool) Description() string { return "List or manage git branches" }

func (t *BranchTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"action": map[string]any{
				"type":        "string",
				"enum":        []string{"list", "create", "delete", "checkout"},
				"description": "Branch action",
			},
			"name": map[string]any{
				"type":        "string",
				"description": "Branch name (for create/delete/checkout)",
			},
		},
		"required": []string{"action"},
	}
}

func (t *BranchTool) Execute(ctx context.Context, input map[string]any) (*Result, error) {
	action, _ := input["action"].(string)
	name, _ := input["name"].(string)

	var args []string
	switch action {
	case "list":
		args = []string{"branch", "-a"}
	case "create":
		args = []string{"branch", name}
	case "delete":
		args = []string{"branch", "-d", name}
	case "checkout":
		args = []string{"checkout", name}
	default:
		return &Result{Content: "Unknown action: " + action, IsError: true}, nil
	}

	c := exec.CommandContext(ctx, "git", args...)
	output, err := c.CombinedOutput()

	return &Result{
		Content: string(output),
		IsError: err != nil,
	}, nil
}
