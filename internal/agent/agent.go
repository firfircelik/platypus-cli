package agent

import (
	"context"
	"fmt"
	"os"
	"strings"
	"sync"

	"github.com/firfircelik/platypus-cli/internal/agent/providers"
	"github.com/firfircelik/platypus-cli/internal/config"
	"github.com/firfircelik/platypus-cli/internal/i18n"
	"github.com/firfircelik/platypus-cli/internal/permissions"
	"github.com/firfircelik/platypus-cli/internal/plans"
	"github.com/firfircelik/platypus-cli/internal/tools"
)

type Agent struct {
	cfg            *config.Config
	providers      []providers.Provider
	toolPool       []tools.Tool
	readOnlyTools  []tools.Tool
	messages       []providers.Message
	ctxMgr         *ContextManager
	compactor      *Compactor
	permChecker    *permissions.PermissionChecker
	planManager    *plans.Manager
	sessionID      string
	claudeMdPrompt string

	planMode       bool
	prePlanMode    permissions.Mode
	turnCount      int
	lastReminderAt int
}

var readOnlyToolNames = map[string]bool{
	"Read":          true,
	"Grep":          true,
	"Glob":          true,
	"WebFetch":      true,
	"WebSearch":     true,
	"Tree":          true,
	"Git":           true,
	"Diff":          true,
	"Branch":        true,
	"Memory":        true,
	"PlanMode":      true,
	"EnterPlanMode": true,
	"ExitPlanMode":  true,
	"Config":        true,
	"SubAgent":      true,
	"ContinuousRun": true,
}

func New(cfg *config.Config) (*Agent, error) {
	var activeProviders []providers.Provider

	switch cfg.Provider {
	case "anthropic":
		activeProviders = append(activeProviders, providers.NewAnthropic(cfg.APIKey, cfg.Model))
	case "openai":
		activeProviders = append(activeProviders, providers.NewOpenAI(cfg.APIKey, cfg.Model))
	default:
		return nil, fmt.Errorf("unknown provider: %s", cfg.Provider)
	}

	allTools := []tools.Tool{
		tools.NewBash(),
		tools.NewFileRead(),
		tools.NewFileWrite(),
		tools.NewFileEdit(),
		tools.NewGrep(),
		tools.NewGlob(),
		tools.NewWebFetch(),
		tools.NewWebSearch(),
		tools.NewTodoWrite(),
		tools.NewTree(),
		tools.NewGit(),
		tools.NewDiff(),
		tools.NewBranch(),
		tools.NewEnterPlanMode(),
		tools.NewExitPlanMode(),
		tools.NewPlanMode(),
		tools.NewConfig(),
		tools.NewCron(),
		tools.NewMemory(),
		tools.NewSubAgent(),
		tools.NewContinuousRun(),
	}

	var readOnlyTools []tools.Tool
	for _, t := range allTools {
		if readOnlyToolNames[t.Name()] {
			readOnlyTools = append(readOnlyTools, t)
		}
	}

	cwd, _ := os.Getwd()
	claudeMdPrompt := config.BuildSystemPromptFromCLAUDEmd(cwd)

	permMode, _ := permissions.ParseMode(cfg.Security)
	if permMode == "" {
		permMode = permissions.Permissive
	}

	return &Agent{
		cfg:            cfg,
		providers:      activeProviders,
		toolPool:       allTools,
		readOnlyTools:  readOnlyTools,
		messages:       []providers.Message{},
		ctxMgr:         NewContextManager(100000),
		compactor:      NewCompactor(100000),
		permChecker:    permissions.NewPermissionChecker(permMode),
		planManager:    plans.NewManager(),
		claudeMdPrompt: claudeMdPrompt,
		prePlanMode:    permMode,
	}, nil
}

func (a *Agent) AddProvider(p providers.Provider) {
	a.providers = append(a.providers, p)
}

func (a *Agent) IsPlanMode() bool {
	return a.planMode
}

func (a *Agent) EnterPlanMode() {
	a.prePlanMode = permissions.Mode(a.cfg.Security)
	a.planMode = true
	a.permChecker.SetMode(permissions.Strict)
}

func (a *Agent) ExitPlanMode() permissions.Mode {
	a.planMode = false
	a.planManager.Clear()
	mode := a.prePlanMode
	if mode == "" {
		mode = permissions.Permissive
	}
	a.permChecker.SetMode(mode)
	a.cfg.Security = string(mode)
	return mode
}

func (a *Agent) GetPlanManager() *plans.Manager {
	return a.planManager
}

func (a *Agent) currentTools() []tools.Tool {
	if a.planMode {
		return a.readOnlyTools
	}
	return a.toolPool
}

func (a *Agent) Run(ctx context.Context, args []string) error {
	if len(args) == 0 {
		t := i18n.Get(a.cfg.Language)
		fmt.Println(t.Usage)
		fmt.Println(t.Example)
		return nil
	}

	userMsg := strings.Join(args, " ")
	a.messages = append(a.messages, providers.Message{
		Role:    "user",
		Content: userMsg,
	})

	maxTurns := 20
	for turn := 0; turn < maxTurns; turn++ {
		a.turnCount++
		a.messages = a.ctxMgr.Deduplicate(a.messages)
		a.messages = a.ctxMgr.Prune(a.messages, a.ctxMgr.maxTokens)

		if a.compactor.NeedsCompaction(a.messages) {
			a.messages = a.compactor.Compact(a.messages, a.planMode)
			if a.cfg.Verbose {
				t := i18n.Get(a.cfg.Language)
				fmt.Printf("[%s] %s\n", t.Compaction, t.CompactionMsg)
			}
		}

		if a.planMode {
			reminder := a.planModeReminder()
			if reminder != "" {
				a.messages = append(a.messages, providers.Message{
					Role:    "user",
					Content: reminder,
				})
				if a.cfg.Verbose {
					fmt.Printf("[plan mode] %s\n", i18n.Get(a.cfg.Language).PlanModeActive)
				}
			}
		}

		resp, err := a.chatWithFallback(ctx, a.messages, a.toolDefs())
		if err != nil {
			t := i18n.Get(a.cfg.Language)
			return fmt.Errorf(t.APIError, err)
		}

		if a.cfg.Verbose {
			fmt.Printf("[tokens] input=%d output=%d\n", resp.Usage.InputTokens, resp.Usage.OutputTokens)
		}

		a.messages = append(a.messages, resp.Messages...)

		hasToolUse := false
		for _, msg := range resp.Messages {
			if msg.ToolUse != nil {
				hasToolUse = true
				break
			}
		}

		if !hasToolUse {
			if a.cfg.Verbose {
				fmt.Println(resp.Messages[len(resp.Messages)-1].Content)
			}
			break
		}

		a.executeToolsParallel(ctx, resp.Messages)
	}

	return nil
}

func (a *Agent) chatWithFallback(ctx context.Context, messages []providers.Message, toolDefs []providers.ToolDef) (*providers.Response, error) {
	var lastErr error
	for i, p := range a.providers {
		resp, err := p.Chat(ctx, messages, toolDefs, a.planMode)
		if err == nil {
			if a.cfg.Verbose && i > 0 {
				t := i18n.Get(a.cfg.Language)
				fmt.Printf(t.ProviderSwitched+"\n", p.Name())
			}
			return resp, nil
		}
		lastErr = err
		if a.cfg.Verbose {
			t := i18n.Get(a.cfg.Language)
			fmt.Printf(t.ProviderFailed, p.Name(), err)
		}
	}
	return nil, lastErr
}

func (a *Agent) executeToolsParallel(ctx context.Context, messages []providers.Message) {
	type toolResult struct {
		toolUseID string
		toolName  string
		result    *tools.Result
		err       error
	}

	var wg sync.WaitGroup
	results := make(chan toolResult, len(messages))

	for _, msg := range messages {
		if msg.ToolUse == nil {
			continue
		}
		tu := msg.ToolUse

		tool := a.findTool(tu.Name)
		if tool == nil {
			results <- toolResult{
				toolUseID: tu.ID,
				toolName:  tu.Name,
				result:    &tools.Result{Content: fmt.Sprintf(i18n.Get(a.cfg.Language).UnknownTool, tu.Name), IsError: true},
			}
			continue
		}

		if a.planMode && !readOnlyToolNames[tu.Name] {
			results <- toolResult{
				toolUseID: tu.ID,
				toolName:  tu.Name,
				result:    &tools.Result{Content: "Plan mode: only read-only tools allowed. Use PlanMode tool to write the plan file.", IsError: true},
			}
			continue
		}

		permDecision := a.permChecker.Check(tu.Name, tu.Input)
		if !permDecision.Allowed {
			results <- toolResult{
				toolUseID: tu.ID,
				toolName:  tu.Name,
				result:    &tools.Result{Content: fmt.Sprintf(i18n.Get(a.cfg.Language).PermissionDenied, permDecision.Reason), IsError: true},
			}
			continue
		}

		wg.Add(1)
		go func() {
			defer wg.Done()
			result, err := tool.Execute(ctx, tu.Input)
			if err != nil {
				result = &tools.Result{Content: err.Error(), IsError: true}
			}
			results <- toolResult{
				toolUseID: tu.ID,
				toolName:  tu.Name,
				result:    result,
				err:       err,
			}
		}()
	}

	wg.Wait()
	close(results)

	for r := range results {
		// Handle ExitPlanMode special case
		if r.toolName == "ExitPlanMode" && !r.result.IsError {
			prevMode := a.ExitPlanMode()
			if a.cfg.Verbose {
				t := i18n.Get(a.cfg.Language)
				fmt.Printf(t.PlanModeExited+"\n", prevMode)
			}
		}

		a.messages = append(a.messages, providers.Message{
			Role:    "tool",
			Content: r.result.Content,
			ToolUse: &providers.ToolUse{ID: r.toolUseID},
		})

		if a.cfg.Verbose {
			status := "✓"
			if r.result.IsError {
				status = "✗"
			}
			fmt.Printf("%s %s → %s\n", status, r.toolName, truncate(r.result.Content, 100))
		}
	}
}

func (a *Agent) findTool(name string) tools.Tool {
	for _, t := range a.currentTools() {
		if t.Name() == name {
			return t
		}
	}
	return nil
}

func (a *Agent) toolDefs() []providers.ToolDef {
	var defs []providers.ToolDef
	for _, t := range a.currentTools() {
		defs = append(defs, providers.ToolDef{
			Name:        t.Name(),
			Description: t.Description(),
			Parameters:  t.Parameters(),
		})
	}
	return defs
}

func (a *Agent) planModeReminder() string {
	if a.turnCount-a.lastReminderAt >= 5 {
		a.lastReminderAt = a.turnCount
		return i18n.Get(a.cfg.Language).PlanModeReminder
	}
	return ""
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}
