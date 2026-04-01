package tools

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"sync"
)

type SubAgentTool struct {
	mu      sync.RWMutex
	agents  map[string]*SubAgent
	binPath string
	workDir string
}

type SubAgent struct {
	ID     string
	Name   string
	Status string
	Prompt string
	PID    int
	Output string
	Error  string
}

func NewSubAgent() *SubAgentTool {
	binPath, _ := os.Executable()
	workDir, _ := os.Getwd()
	return &SubAgentTool{
		agents:  make(map[string]*SubAgent),
		binPath: binPath,
		workDir: workDir,
	}
}

func (t *SubAgentTool) Name() string        { return "SubAgent" }
func (t *SubAgentTool) Description() string { return "Spawn and manage sub-agents for parallel work" }

func (t *SubAgentTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"action": map[string]any{
				"type":        "string",
				"enum":        []string{"spawn", "stop", "status", "list"},
				"description": "Action to perform",
			},
			"name": map[string]any{
				"type":        "string",
				"description": "Agent name",
			},
			"prompt": map[string]any{
				"type":        "string",
				"description": "Task prompt for the agent",
			},
			"id": map[string]any{
				"type":        "string",
				"description": "Agent ID (for stop/status)",
			},
		},
		"required": []string{"action"},
	}
}

func (t *SubAgentTool) Execute(ctx context.Context, input map[string]any) (*Result, error) {
	action, _ := input["action"].(string)

	switch action {
	case "spawn":
		return t.spawnAgent(input)
	case "stop":
		return t.stopAgent(input)
	case "status":
		return t.agentStatus(input)
	case "list":
		return t.listAgents()
	default:
		return &Result{Content: "Unknown action: " + action, IsError: true}, nil
	}
}

func (t *SubAgentTool) spawnAgent(input map[string]any) (*Result, error) {
	name, _ := input["name"].(string)
	prompt, _ := input["prompt"].(string)

	if name == "" {
		name = fmt.Sprintf("agent-%d", len(t.agents)+1)
	}
	if prompt == "" {
		return &Result{Content: "Missing prompt parameter", IsError: true}, nil
	}

	id := fmt.Sprintf("agent-%d", len(t.agents)+1)

	agent := &SubAgent{
		ID:     id,
		Name:   name,
		Status: "starting",
		Prompt: prompt,
	}

	t.mu.Lock()
	t.agents[id] = agent
	t.mu.Unlock()

	cmd := exec.Command(t.binPath, prompt)
	cmd.Dir = t.workDir

	if err := cmd.Start(); err != nil {
		agent.Status = "failed"
		agent.Error = err.Error()
		return &Result{Content: fmt.Sprintf("Failed to spawn agent: %s", err.Error()), IsError: true}, nil
	}

	agent.PID = cmd.Process.Pid
	agent.Status = "running"

	go func() {
		output, err := cmd.CombinedOutput()
		t.mu.Lock()
		defer t.mu.Unlock()
		agent.Output = string(output)
		if err != nil {
			agent.Status = "failed"
			agent.Error = err.Error()
		} else {
			agent.Status = "completed"
		}
	}()

	return &Result{
		Content: fmt.Sprintf("Sub-agent '%s' spawned (ID: %s, PID: %d)", name, id, agent.PID),
	}, nil
}

func (t *SubAgentTool) stopAgent(input map[string]any) (*Result, error) {
	id, _ := input["id"].(string)
	if id == "" {
		return &Result{Content: "Missing id parameter", IsError: true}, nil
	}

	t.mu.Lock()
	defer t.mu.Unlock()

	agent, ok := t.agents[id]
	if !ok {
		return &Result{Content: "Agent not found: " + id, IsError: true}, nil
	}

	if agent.PID > 0 {
		process, err := os.FindProcess(agent.PID)
		if err == nil {
			process.Kill()
		}
	}

	agent.Status = "stopped"
	return &Result{Content: fmt.Sprintf("Agent '%s' stopped", agent.Name)}, nil
}

func (t *SubAgentTool) agentStatus(input map[string]any) (*Result, error) {
	id, _ := input["id"].(string)
	if id == "" {
		return &Result{Content: "Missing id parameter", IsError: true}, nil
	}

	t.mu.RLock()
	defer t.mu.RUnlock()

	agent, ok := t.agents[id]
	if !ok {
		return &Result{Content: "Agent not found: " + id, IsError: true}, nil
	}

	return &Result{
		Content: fmt.Sprintf("Agent: %s\nStatus: %s\nPID: %d\nPrompt: %s\nOutput: %s",
			agent.Name, agent.Status, agent.PID, agent.Prompt, truncateStr(agent.Output, 500)),
	}, nil
}

func (t *SubAgentTool) listAgents() (*Result, error) {
	t.mu.RLock()
	defer t.mu.RUnlock()

	if len(t.agents) == 0 {
		return &Result{Content: "No active agents"}, nil
	}

	var sb strings.Builder
	sb.WriteString("Active agents:\n")
	for _, agent := range t.agents {
		sb.WriteString(fmt.Sprintf("  [%s] %s (PID: %d) - %s\n",
			agent.Status, agent.Name, agent.PID, agent.Prompt))
	}

	return &Result{Content: sb.String()}, nil
}

func truncateStr(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}
