package daemon

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/firfircelik/platypus-cli/internal/watcher"
)

type Task struct {
	ID       string
	Name     string
	Trigger  string
	Command  string
	LastRun  time.Time
	RunCount int
	Status   string
	Output   string
}

type Daemon struct {
	mu        sync.RWMutex
	tasks     []*Task
	watcher   *watcher.Watcher
	workDir   string
	stateFile string
	stopCh    chan struct{}
	running   bool
}

func NewDaemon(workDir string) *Daemon {
	if workDir == "" {
		workDir, _ = os.Getwd()
	}

	stateFile := filepath.Join(workDir, ".platypus", "daemon-state.json")

	d := &Daemon{
		workDir:   workDir,
		stateFile: stateFile,
		stopCh:    make(chan struct{}),
	}

	d.watcher = watcher.NewWatcher(2*time.Second, d.onFileChange)

	return d
}

func (d *Daemon) AddTask(name, trigger, command string) *Task {
	d.mu.Lock()
	defer d.mu.Unlock()

	task := &Task{
		ID:      fmt.Sprintf("task-%d", len(d.tasks)+1),
		Name:    name,
		Trigger: trigger,
		Command: command,
		Status:  "waiting",
	}

	d.tasks = append(d.tasks, task)

	if trigger != "" && trigger != "manual" {
		parts := strings.Split(trigger, ",")
		for _, p := range parts {
			p = strings.TrimSpace(p)
			if p != "" {
				d.watcher.Add(p)
			}
		}
	}

	return task
}

func (d *Daemon) RemoveTask(id string) {
	d.mu.Lock()
	defer d.mu.Unlock()

	for i, t := range d.tasks {
		if t.ID == id {
			d.tasks = append(d.tasks[:i], d.tasks[i+1:]...)
			return
		}
	}
}

func (d *Daemon) ListTasks() []*Task {
	d.mu.RLock()
	defer d.mu.RUnlock()
	return d.tasks
}

func (d *Daemon) RunTask(id string) error {
	d.mu.Lock()
	var task *Task
	for _, t := range d.tasks {
		if t.ID == id {
			task = t
			break
		}
	}
	if task == nil {
		d.mu.Unlock()
		return fmt.Errorf("task not found: %s", id)
	}
	d.mu.Unlock()

	task.Status = "running"
	task.LastRun = time.Now()
	task.RunCount++

	cmd := exec.Command("bash", "-c", task.Command)
	cmd.Dir = d.workDir

	output, err := cmd.CombinedOutput()
	task.Output = string(output)

	if err != nil {
		task.Status = "failed"
		task.Output += "\nError: " + err.Error()
		return err
	}

	task.Status = "completed"
	return nil
}

func (d *Daemon) onFileChange(event watcher.Event) {
	d.mu.RLock()
	var matchingTasks []*Task
	for _, task := range d.tasks {
		if task.Trigger == "" || task.Trigger == "manual" {
			continue
		}

		patterns := strings.Split(task.Trigger, ",")
		for _, pattern := range patterns {
			pattern = strings.TrimSpace(pattern)
			if matched, _ := filepath.Match(pattern, event.Path); matched {
				matchingTasks = append(matchingTasks, task)
				break
			}
		}
	}
	d.mu.RUnlock()

	for _, task := range matchingTasks {
		go func(t *Task) {
			d.RunTask(t.ID)
		}(task)
	}
}

func (d *Daemon) Start() error {
	d.mu.Lock()
	if d.running {
		d.mu.Unlock()
		return fmt.Errorf("daemon already running")
	}
	d.running = true
	d.mu.Unlock()

	d.watcher.Start()

	fmt.Printf("Daemon started (watching %d tasks)\n", len(d.tasks))

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	select {
	case <-sigCh:
		fmt.Println("\nDaemon stopping...")
		d.Stop()
	case <-d.stopCh:
	}

	return nil
}

func (d *Daemon) Stop() {
	d.mu.Lock()
	defer d.mu.Unlock()
	if !d.running {
		return
	}
	d.running = false
	d.watcher.Stop()
}

func (d *Daemon) SaveState() error {
	d.mu.RLock()
	defer d.mu.RUnlock()

	data, _ := json.Marshal(d.tasks)
	os.MkdirAll(filepath.Dir(d.stateFile), 0755)
	return os.WriteFile(d.stateFile, data, 0644)
}

func (d *Daemon) LoadState() error {
	d.mu.Lock()
	defer d.mu.Unlock()

	data, err := os.ReadFile(d.stateFile)
	if err != nil {
		return err
	}

	return json.Unmarshal(data, &d.tasks)
}

func (d *Daemon) Status() string {
	d.mu.RLock()
	defer d.mu.RUnlock()

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Daemon: %s\n", map[bool]string{true: "running", false: "stopped"}[d.running]))
	sb.WriteString(fmt.Sprintf("Tasks: %d\n", len(d.tasks)))

	for _, t := range d.tasks {
		status := t.Status
		if t.Status == "waiting" {
			status = "idle"
		}
		sb.WriteString(fmt.Sprintf("  [%s] %s (%s) - %d runs\n", status, t.Name, t.Trigger, t.RunCount))
	}

	return sb.String()
}
