package swarm

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"time"
)

type AgentStatus string

const (
	StatusIdle      AgentStatus = "idle"
	StatusRunning   AgentStatus = "running"
	StatusCompleted AgentStatus = "completed"
	StatusFailed    AgentStatus = "failed"
	StatusStopped   AgentStatus = "stopped"
)

type Agent struct {
	ID        string      `json:"id"`
	Name      string      `json:"name"`
	Status    AgentStatus `json:"status"`
	Prompt    string      `json:"prompt"`
	Provider  string      `json:"provider"`
	Model     string      `json:"model"`
	WorkDir   string      `json:"work_dir"`
	PID       int         `json:"pid"`
	StartedAt time.Time   `json:"started_at"`
	Output    string      `json:"output"`
	Error     string      `json:"error"`
}

type Swarm struct {
	mu      sync.RWMutex
	agents  map[string]*Agent
	mailbox *Mailbox
	workDir string
	binPath string
}

func NewSwarm(binPath, workDir string) *Swarm {
	if workDir == "" {
		workDir, _ = os.Getwd()
	}
	return &Swarm{
		agents:  make(map[string]*Agent),
		mailbox: NewMailbox(DefaultMailDir()),
		workDir: workDir,
		binPath: binPath,
	}
}

func (s *Swarm) Spawn(name, prompt, provider, model string) (*Agent, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	id := fmt.Sprintf("agent-%d", time.Now().UnixNano())

	agent := &Agent{
		ID:        id,
		Name:      name,
		Status:    StatusRunning,
		Prompt:    prompt,
		Provider:  provider,
		Model:     model,
		WorkDir:   s.workDir,
		StartedAt: time.Now(),
	}

	s.agents[id] = agent

	cmd := exec.Command(s.binPath, "--provider", provider, "--model", model, prompt)
	cmd.Dir = s.workDir
	cmd.Stdout = nil
	cmd.Stderr = nil

	if err := cmd.Start(); err != nil {
		agent.Status = StatusFailed
		agent.Error = err.Error()
		return nil, fmt.Errorf("failed to spawn agent: %w", err)
	}

	agent.PID = cmd.Process.Pid

	go func() {
		err := cmd.Wait()
		s.mu.Lock()
		defer s.mu.Unlock()
		if err != nil {
			agent.Status = StatusFailed
			agent.Error = err.Error()
		} else {
			agent.Status = StatusCompleted
		}
	}()

	return agent, nil
}

func (s *Swarm) SpawnInNewTerminal(name, prompt, provider, model string) (*Agent, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	id := fmt.Sprintf("agent-%d", time.Now().UnixNano())

	agent := &Agent{
		ID:        id,
		Name:      name,
		Status:    StatusRunning,
		Prompt:    prompt,
		Provider:  provider,
		Model:     model,
		WorkDir:   s.workDir,
		StartedAt: time.Now(),
	}

	s.agents[id] = agent

	var cmd *exec.Cmd
	switch detectTerminal() {
	case "iterm":
		cmd = exec.Command("osascript", "-e",
			fmt.Sprintf(`tell application "iTerm2"
				set newWindow to (create window with default profile)
				tell current session of newWindow
					write text "%s --provider %s --model %s '%s'"
				end tell
			end tell`, s.binPath, provider, model, prompt))
	case "tmux":
		cmd = exec.Command("tmux", "new-window", "-n", name,
			fmt.Sprintf("%s --provider %s --model %s '%s'", s.binPath, provider, model, prompt))
	default:
		cmd = exec.Command(s.binPath, "--provider", provider, "--model", model, prompt)
	}

	cmd.Dir = s.workDir

	if err := cmd.Start(); err != nil {
		agent.Status = StatusFailed
		agent.Error = err.Error()
		return nil, fmt.Errorf("failed to spawn agent in terminal: %w", err)
	}

	agent.PID = cmd.Process.Pid

	return agent, nil
}

func (s *Swarm) Stop(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	agent, ok := s.agents[id]
	if !ok {
		return fmt.Errorf("agent not found: %s", id)
	}

	if agent.PID > 0 {
		process, err := os.FindProcess(agent.PID)
		if err == nil {
			process.Kill()
		}
	}

	agent.Status = StatusStopped
	return nil
}

func (s *Swarm) Get(id string) *Agent {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.agents[id]
}

func (s *Swarm) List() []*Agent {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var agents []*Agent
	for _, a := range s.agents {
		agents = append(agents, a)
	}
	return agents
}

func (s *Swarm) Running() []*Agent {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var agents []*Agent
	for _, a := range s.agents {
		if a.Status == StatusRunning {
			agents = append(agents, a)
		}
	}
	return agents
}

func (s *Swarm) Mailbox() *Mailbox {
	return s.mailbox
}

func (s *Swarm) SaveState(path string) error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	data, err := json.Marshal(s.agents)
	if err != nil {
		return err
	}

	os.MkdirAll(filepath.Dir(path), 0755)
	return os.WriteFile(path, data, 0644)
}

func (s *Swarm) LoadState(path string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	return json.Unmarshal(data, &s.agents)
}

func detectTerminal() string {
	if os.Getenv("TMUX") != "" {
		return "tmux"
	}
	if os.Getenv("ITERM_SESSION_ID") != "" {
		return "iterm"
	}
	return "default"
}
