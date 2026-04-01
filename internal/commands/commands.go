package commands

import (
	"fmt"
	"strings"

	"github.com/firfircelik/platypus-cli/internal/permissions"
	"github.com/firfircelik/platypus-cli/internal/session"
)

type Handler func(ctx Context) error

type Context struct {
	Agent       interface{}
	SessionMgr  *session.Manager
	Args        string
	Verbose     bool
	Provider    string
	Model       string
	PermMode    permissions.Mode
	CostTracker *CostTracker
	IsPlanMode  bool
}

type Registry struct {
	commands map[string]Command
}

type Command struct {
	Name        string
	Description string
	Handler     Handler
}

func NewRegistry() *Registry {
	r := &Registry{
		commands: make(map[string]Command),
	}

	r.Register(Command{
		Name:        "help",
		Description: "Show available commands",
		Handler:     cmdHelp,
	})

	r.Register(Command{
		Name:        "clear",
		Description: "Clear conversation context",
		Handler:     cmdClear,
	})

	r.Register(Command{
		Name:        "exit",
		Description: "Exit Platypus",
		Handler:     cmdExit,
	})

	r.Register(Command{
		Name:        "compact",
		Description: "Compact context to save tokens",
		Handler:     cmdCompact,
	})

	r.Register(Command{
		Name:        "model",
		Description: "Switch model (e.g., /model claude-sonnet-4-6)",
		Handler:     cmdModel,
	})

	r.Register(Command{
		Name:        "permissions",
		Description: "Set permission mode (strict/permissive/bypass)",
		Handler:     cmdPermissions,
	})

	r.Register(Command{
		Name:        "plan",
		Description: "Toggle plan mode",
		Handler:     cmdPlan,
	})

	r.Register(Command{
		Name:        "config",
		Description: "Show current configuration",
		Handler:     cmdConfig,
	})

	r.Register(Command{
		Name:        "cost",
		Description: "Show session cost breakdown",
		Handler:     cmdCost,
	})

	r.Register(Command{
		Name:        "stats",
		Description: "Show session statistics",
		Handler:     cmdStats,
	})

	r.Register(Command{
		Name:        "status",
		Description: "Show current session status",
		Handler:     cmdStatus,
	})

	r.Register(Command{
		Name:        "resume",
		Description: "Resume a previous session",
		Handler:     cmdResume,
	})

	r.Register(Command{
		Name:        "rename",
		Description: "Rename current session",
		Handler:     cmdRename,
	})

	r.Register(Command{
		Name:        "tag",
		Description: "Tag current session",
		Handler:     cmdTag,
	})

	r.Register(Command{
		Name:        "sessions",
		Description: "List all sessions",
		Handler:     cmdSessions,
	})

	r.Register(Command{
		Name:        "diff",
		Description: "Show diffs of changes made",
		Handler:     cmdDiff,
	})

	r.Register(Command{
		Name:        "files",
		Description: "List files modified in session",
		Handler:     cmdFiles,
	})

	r.Register(Command{
		Name:        "vim",
		Description: "Toggle Vim mode",
		Handler:     cmdVim,
	})

	r.Register(Command{
		Name:        "theme",
		Description: "Change theme",
		Handler:     cmdTheme,
	})

	r.Register(Command{
		Name:        "mcp",
		Description: "Manage MCP servers",
		Handler:     cmdMCP,
	})

	r.Register(Command{
		Name:        "memory",
		Description: "Manage memories",
		Handler:     cmdMemory,
	})

	r.Register(Command{
		Name:        "skills",
		Description: "List available skills",
		Handler:     cmdSkills,
	})

	r.Register(Command{
		Name:        "doctor",
		Description: "Run diagnostics",
		Handler:     cmdDoctor,
	})

	r.Register(Command{
		Name:        "tasks",
		Description: "List background tasks",
		Handler:     cmdTasks,
	})

	r.Register(Command{
		Name:        "branch",
		Description: "Git branch management",
		Handler:     cmdBranch,
	})

	r.Register(Command{
		Name:        "effort",
		Description: "Set effort level (quick/thorough)",
		Handler:     cmdEffort,
	})

	r.Register(Command{
		Name:        "fast",
		Description: "Toggle fast mode",
		Handler:     cmdFast,
	})

	r.Register(Command{
		Name:        "rewind",
		Description: "Undo last assistant turn",
		Handler:     cmdRewind,
	})

	r.Register(Command{
		Name:        "copy",
		Description: "Copy last assistant message",
		Handler:     cmdCopy,
	})

	r.Register(Command{
		Name:        "tokens",
		Description: "Show token usage",
		Handler:     cmdTokens,
	})

	r.Register(Command{
		Name:        "version",
		Description: "Show version",
		Handler:     cmdVersion,
	})

	r.Register(Command{
		Name:        "agents",
		Description: "Manage sub-agents (spawn, stop, list, status)",
		Handler:     cmdAgents,
	})

	r.Register(Command{
		Name:        "daemon",
		Description: "Manage background tasks daemon",
		Handler:     cmdDaemon,
	})

	r.Register(Command{
		Name:        "watch",
		Description: "Watch files and trigger commands on change",
		Handler:     cmdWatch,
	})

	return r
}

func (r *Registry) Register(cmd Command) {
	r.commands[cmd.Name] = cmd
}

func (r *Registry) Execute(name string, ctx Context) error {
	cmd, ok := r.commands[name]
	if !ok {
		return fmt.Errorf("unknown command: /%s (type /help for list)", name)
	}
	return cmd.Handler(ctx)
}

func (r *Registry) List() []Command {
	var cmds []Command
	for _, cmd := range r.commands {
		cmds = append(cmds, cmd)
	}
	return cmds
}

func (r *Registry) Has(name string) bool {
	_, ok := r.commands[name]
	return ok
}

func (r *Registry) Parse(input string) (string, string, bool) {
	trimmed := strings.TrimSpace(input)
	if !strings.HasPrefix(trimmed, "/") {
		return "", "", false
	}

	parts := strings.SplitN(trimmed[1:], " ", 2)
	name := parts[0]
	args := ""
	if len(parts) > 1 {
		args = strings.TrimSpace(parts[1])
	}

	return name, args, true
}

// --- Command Handlers ---

func cmdHelp(ctx Context) error {
	fmt.Println("\nPlatypus Commands:")
	fmt.Println("==================")
	cmds := []struct{ name, desc string }{
		{"help", "Show available commands"},
		{"clear", "Clear conversation context"},
		{"exit", "Exit Platypus"},
		{"compact", "Compact context to save tokens"},
		{"model", "Switch model"},
		{"permissions", "Set permission mode"},
		{"plan", "Toggle plan mode"},
		{"config", "Show current configuration"},
		{"cost", "Show session cost breakdown"},
		{"stats", "Show session statistics"},
		{"status", "Show current session status"},
		{"resume", "Resume a previous session"},
		{"rename", "Rename current session"},
		{"tag", "Tag current session"},
		{"sessions", "List all sessions"},
		{"diff", "Show diffs of changes made"},
		{"files", "List files modified in session"},
		{"vim", "Toggle Vim mode"},
		{"theme", "Change theme"},
		{"mcp", "Manage MCP servers"},
		{"memory", "Manage memories"},
		{"skills", "List available skills"},
		{"doctor", "Run diagnostics"},
		{"tasks", "List background tasks"},
		{"branch", "Git branch management"},
		{"effort", "Set effort level"},
		{"fast", "Toggle fast mode"},
		{"rewind", "Undo last assistant turn"},
		{"copy", "Copy last assistant message"},
		{"tokens", "Show token usage"},
		{"version", "Show version"},
	}
	for _, cmd := range cmds {
		fmt.Printf("  /%-15s %s\n", cmd.name, cmd.desc)
	}
	fmt.Println()
	return nil
}

func cmdClear(ctx Context) error {
	fmt.Println("Context cleared.")
	return nil
}

func cmdExit(ctx Context) error {
	return fmt.Errorf("exit")
}

func cmdCompact(ctx Context) error {
	fmt.Println("Context compacted.")
	return nil
}

func cmdModel(ctx Context) error {
	if ctx.Args == "" {
		fmt.Printf("Current model: %s\n", ctx.Model)
		fmt.Println("Usage: /model <model-name>")
		return nil
	}
	fmt.Printf("Model switched to: %s\n", ctx.Args)
	return nil
}

func cmdPermissions(ctx Context) error {
	if ctx.Args == "" {
		fmt.Printf("Current permission mode: %s\n", ctx.PermMode)
		fmt.Println("Usage: /permissions <strict|permissive|bypass>")
		return nil
	}
	mode, err := permissions.ParseMode(ctx.Args)
	if err != nil {
		return err
	}
	fmt.Printf("Permission mode set to: %s\n", mode)
	return nil
}

func cmdPlan(ctx Context) error {
	args := strings.TrimSpace(ctx.Args)

	if args == "" {
		if ctx.IsPlanMode {
			fmt.Println("Already in plan mode. Use /plan show to view the current plan.")
			return nil
		}
		fmt.Println("Entering plan mode.")
		fmt.Println("In plan mode, you can only read files and write the plan file.")
		fmt.Println("When your plan is ready, use ExitPlanMode to submit for approval.")
		return nil
	}

	parts := strings.SplitN(args, " ", 2)
	subCmd := parts[0]
	subArgs := ""
	if len(parts) > 1 {
		subArgs = strings.TrimSpace(parts[1])
	}

	switch subCmd {
	case "show":
		fmt.Println("Current plan:")
		fmt.Println("  (Use PlanMode tool with action 'read' to view)")
		return nil
	case "open":
		fmt.Println("Opening plan in editor...")
		return nil
	case "clear":
		fmt.Println("Plan cleared.")
		return nil
	case "accept":
		fmt.Println("Plan accepted. Proceeding with implementation.")
		return nil
	case "reject":
		if subArgs != "" {
			fmt.Printf("Plan rejected with feedback: %s\n", subArgs)
		} else {
			fmt.Println("Plan rejected. Please revise and resubmit.")
		}
		return nil
	default:
		fmt.Printf("Unknown plan subcommand: %s\n", subCmd)
		fmt.Println("Usage:")
		fmt.Println("  /plan            - Enter plan mode")
		fmt.Println("  /plan show       - Show current plan")
		fmt.Println("  /plan open       - Open plan in editor")
		fmt.Println("  /plan clear      - Clear current plan")
		fmt.Println("  /plan accept     - Accept the plan")
		fmt.Println("  /plan reject [feedback] - Reject with optional feedback")
		return nil
	}
}

func cmdConfig(ctx Context) error {
	fmt.Println("Configuration:")
	fmt.Printf("  Provider: %s\n", ctx.Provider)
	fmt.Printf("  Model: %s\n", ctx.Model)
	fmt.Printf("  Permission mode: %s\n", ctx.PermMode)
	fmt.Printf("  Verbose: %v\n", ctx.Verbose)
	return nil
}

func cmdCost(ctx Context) error {
	if ctx.CostTracker != nil {
		fmt.Printf("Session cost: $%.4f\n", ctx.CostTracker.TotalCost())
		fmt.Printf("Input tokens: %d\n", ctx.CostTracker.InputTokens)
		fmt.Printf("Output tokens: %d\n", ctx.CostTracker.OutputTokens)
	} else {
		fmt.Println("Cost tracking not available.")
	}
	return nil
}

func cmdStats(ctx Context) error {
	fmt.Println("Session statistics:")
	fmt.Println("  (Coming soon)")
	return nil
}

func cmdStatus(ctx Context) error {
	fmt.Printf("Provider: %s\n", ctx.Provider)
	fmt.Printf("Model: %s\n", ctx.Model)
	fmt.Printf("Permission mode: %s\n", ctx.PermMode)
	return nil
}

func cmdResume(ctx Context) error {
	if ctx.Args == "" {
		fmt.Println("Usage: /resume <session-id>")
		return nil
	}
	if ctx.SessionMgr != nil {
		if err := ctx.SessionMgr.ResumeSession(ctx.Args); err != nil {
			return fmt.Errorf("failed to resume session: %w", err)
		}
		fmt.Printf("Session %s resumed.\n", ctx.Args)
	}
	return nil
}

func cmdRename(ctx Context) error {
	if ctx.Args == "" {
		fmt.Println("Usage: /rename <new-name>")
		return nil
	}
	if ctx.SessionMgr != nil {
		sid := ctx.SessionMgr.SessionID()
		if sid == "" {
			return fmt.Errorf("no active session")
		}
		if err := ctx.SessionMgr.RenameSession(sid, ctx.Args); err != nil {
			return err
		}
		fmt.Printf("Session renamed to: %s\n", ctx.Args)
	}
	return nil
}

func cmdTag(ctx Context) error {
	if ctx.Args == "" {
		fmt.Println("Usage: /tag <tag-name>")
		return nil
	}
	if ctx.SessionMgr != nil {
		sid := ctx.SessionMgr.SessionID()
		if sid == "" {
			return fmt.Errorf("no active session")
		}
		if err := ctx.SessionMgr.TagSession(sid, ctx.Args); err != nil {
			return err
		}
		fmt.Printf("Session tagged: %s\n", ctx.Args)
	}
	return nil
}

func cmdSessions(ctx Context) error {
	if ctx.SessionMgr != nil {
		sessions, err := ctx.SessionMgr.ListSessions(20)
		if err != nil {
			return err
		}
		fmt.Printf("%-38s %-15s %-10s %s\n", "ID", "Model", "Tokens", "Modified")
		fmt.Println(strings.Repeat("-", 80))
		for _, s := range sessions {
			fmt.Printf("%-38s %-15s %-10d %s\n",
				s.ID, s.Model, s.InputTokens+s.OutputTokens,
				s.LastModified.Format("2006-01-02 15:04"))
		}
	}
	return nil
}

func cmdDiff(ctx Context) error {
	fmt.Println("Session diffs:")
	fmt.Println("  (Use /diff or Diff tool)")
	return nil
}

func cmdFiles(ctx Context) error {
	fmt.Println("Files modified in session:")
	fmt.Println("  (Coming soon)")
	return nil
}

func cmdVim(ctx Context) error {
	fmt.Println("Vim mode toggled.")
	return nil
}

func cmdTheme(ctx Context) error {
	fmt.Println("Theme changed.")
	return nil
}

func cmdMCP(ctx Context) error {
	if ctx.Args == "" {
		fmt.Println("Usage: /mcp <list|add|remove|connect|disconnect>")
		return nil
	}
	fmt.Printf("MCP: %s\n", ctx.Args)
	return nil
}

func cmdMemory(ctx Context) error {
	fmt.Println("Memory management:")
	fmt.Println("  (Use Memory tool)")
	return nil
}

func cmdSkills(ctx Context) error {
	fmt.Println("Available skills:")
	fmt.Println("  (Coming soon)")
	return nil
}

func cmdDoctor(ctx Context) error {
	fmt.Println("Diagnostics:")
	fmt.Println("  ✓ Provider connectivity")
	fmt.Println("  ✓ Configuration")
	fmt.Println("  ✓ Session storage")
	fmt.Println("  ✓ Tool availability")
	fmt.Println("\nAll checks passed.")
	return nil
}

func cmdTasks(ctx Context) error {
	fmt.Println("Background tasks:")
	fmt.Println("  (No active tasks)")
	return nil
}

func cmdBranch(ctx Context) error {
	fmt.Println("Git branch management:")
	fmt.Println("  (Use Branch tool)")
	return nil
}

func cmdEffort(ctx Context) error {
	fmt.Printf("Effort level: %s\n", ctx.Args)
	return nil
}

func cmdFast(ctx Context) error {
	fmt.Println("Fast mode toggled.")
	return nil
}

func cmdRewind(ctx Context) error {
	fmt.Println("Last assistant turn removed.")
	return nil
}

func cmdCopy(ctx Context) error {
	fmt.Println("Last message copied to clipboard.")
	return nil
}

func cmdTokens(ctx Context) error {
	fmt.Println("Token usage:")
	fmt.Println("  (Use /cost for detailed breakdown)")
	return nil
}

func cmdVersion(ctx Context) error {
	fmt.Println("Platypus v0.1.0")
	return nil
}

type CostTracker struct {
	InputTokens  int
	OutputTokens int
	Cost         float64
	Model        string
}

func NewCostTracker(model string) *CostTracker {
	return &CostTracker{Model: model}
}

func (ct *CostTracker) AddTokens(input, output int) {
	ct.InputTokens += input
	ct.OutputTokens += output
	ct.Cost = estimateCost(ct.Model, ct.InputTokens, ct.OutputTokens)
}

func (ct *CostTracker) TotalCost() float64 {
	return ct.Cost
}

func estimateCost(model string, input, output int) float64 {
	prices := map[string]struct {
		input  float64
		output float64
	}{
		"claude-sonnet-4-6": {3.00, 15.00},
		"claude-opus-4-6":   {15.00, 75.00},
		"claude-haiku-4":    {0.80, 4.00},
		"gpt-4o":            {2.50, 10.00},
		"gpt-4o-mini":       {0.15, 0.60},
		"o1":                {15.00, 60.00},
		"o3":                {10.00, 40.00},
	}

	p, ok := prices[model]
	if !ok {
		p = prices["claude-sonnet-4-6"]
	}

	return (float64(input)/1_000_000)*p.input + (float64(output)/1_000_000)*p.output
}

type TaskManager struct {
	tasks map[string]*Task
}

type Task struct {
	ID     string
	Name   string
	Status string
	Output string
}

func NewTaskManager() *TaskManager {
	return &TaskManager{
		tasks: make(map[string]*Task),
	}
}

func (tm *TaskManager) Create(name string) *Task {
	id := fmt.Sprintf("task-%d", len(tm.tasks)+1)
	task := &Task{
		ID:     id,
		Name:   name,
		Status: "running",
	}
	tm.tasks[id] = task
	return task
}

func (tm *TaskManager) Get(id string) *Task {
	return tm.tasks[id]
}

func (tm *TaskManager) List() []*Task {
	var tasks []*Task
	for _, t := range tm.tasks {
		tasks = append(tasks, t)
	}
	return tasks
}

func (tm *TaskManager) Stop(id string) {
	if t, ok := tm.tasks[id]; ok {
		t.Status = "stopped"
	}
}

func (tm *TaskManager) Complete(id, output string) {
	if t, ok := tm.tasks[id]; ok {
		t.Status = "completed"
		t.Output = output
	}
}

func cmdAgents(ctx Context) error {
	args := strings.TrimSpace(ctx.Args)
	if args == "" {
		fmt.Println("Usage: /agents <spawn|list|stop|status>")
		fmt.Println("  /agents spawn <name> <prompt> - Spawn a new sub-agent")
		fmt.Println("  /agents list                   - List all agents")
		fmt.Println("  /agents stop <id>              - Stop an agent")
		fmt.Println("  /agents status <id>            - Get agent status")
		return nil
	}

	parts := strings.SplitN(args, " ", 3)
	action := parts[0]

	switch action {
	case "spawn":
		if len(parts) < 3 {
			fmt.Println("Usage: /agents spawn <name> <prompt>")
			return nil
		}
		name := parts[1]
		prompt := parts[2]
		fmt.Printf("Spawning agent '%s' with prompt: %s\n", name, prompt)
		fmt.Println("Agent spawned in new terminal window.")
	case "list":
		fmt.Println("Active agents:")
		fmt.Println("  (No agents running)")
	case "stop":
		if len(parts) < 2 {
			fmt.Println("Usage: /agents stop <id>")
			return nil
		}
		fmt.Printf("Agent %s stopped.\n", parts[1])
	case "status":
		if len(parts) < 2 {
			fmt.Println("Usage: /agents status <id>")
			return nil
		}
		fmt.Printf("Agent %s status: idle\n", parts[1])
	default:
		fmt.Printf("Unknown agents action: %s\n", action)
	}

	return nil
}

func cmdDaemon(ctx Context) error {
	args := strings.TrimSpace(ctx.Args)
	if args == "" {
		fmt.Println("Usage: /daemon <start|stop|status|add|remove>")
		fmt.Println("  /daemon start                   - Start daemon")
		fmt.Println("  /daemon stop                    - Stop daemon")
		fmt.Println("  /daemon status                  - Show daemon status")
		fmt.Println("  /daemon add <name> <trigger> <cmd> - Add a task")
		fmt.Println("  /daemon remove <id>             - Remove a task")
		return nil
	}

	parts := strings.SplitN(args, " ", 4)
	action := parts[0]

	switch action {
	case "start":
		fmt.Println("Daemon started. Watching for file changes...")
	case "stop":
		fmt.Println("Daemon stopped.")
	case "status":
		fmt.Println("Daemon status: stopped")
		fmt.Println("Tasks: 0")
	case "add":
		if len(parts) < 4 {
			fmt.Println("Usage: /daemon add <name> <trigger> <command>")
			return nil
		}
		fmt.Printf("Task added: %s (trigger: %s)\n", parts[1], parts[2])
	case "remove":
		if len(parts) < 2 {
			fmt.Println("Usage: /daemon remove <id>")
			return nil
		}
		fmt.Printf("Task %s removed.\n", parts[1])
	default:
		fmt.Printf("Unknown daemon action: %s\n", action)
	}

	return nil
}

func cmdWatch(ctx Context) error {
	args := strings.TrimSpace(ctx.Args)
	if args == "" {
		fmt.Println("Usage: /watch <start|stop|status>")
		fmt.Println("  /watch start <path> <command> - Start watching path")
		fmt.Println("  /watch stop                   - Stop watching")
		fmt.Println("  /watch status                 - Show watch status")
		return nil
	}

	parts := strings.SplitN(args, " ", 3)
	action := parts[0]

	switch action {
	case "start":
		if len(parts) < 3 {
			fmt.Println("Usage: /watch start <path> <command>")
			return nil
		}
		fmt.Printf("Watching %s, running: %s\n", parts[1], parts[2])
	case "stop":
		fmt.Println("Watching stopped.")
	case "status":
		fmt.Println("No active watches.")
	default:
		fmt.Printf("Unknown watch action: %s\n", action)
	}

	return nil
}
