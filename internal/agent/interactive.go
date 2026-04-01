package agent

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"

	"github.com/firfircelik/platypus-cli/internal/agent/providers"
	"github.com/firfircelik/platypus-cli/internal/commands"
	"github.com/firfircelik/platypus-cli/internal/permissions"
)

func (a *Agent) RunInteractive(ctx context.Context) error {
	cmdRegistry := commands.NewRegistry()
	costTracker := commands.NewCostTracker(a.cfg.Model)
	_ = commands.NewTaskManager()

	fmt.Println("Platypus v0.1.0 — iş yap, konuşma")
	fmt.Println("Type /help for commands, /exit to quit")
	fmt.Println()

	scanner := bufio.NewScanner(os.Stdin)
	for {
		fmt.Print("> ")
		if !scanner.Scan() {
			break
		}

		input := strings.TrimSpace(scanner.Text())
		if input == "" {
			continue
		}

		// Check for slash command
		if cmdName, cmdArgs, isCmd := cmdRegistry.Parse(input); isCmd {
			cmdCtx := commands.Context{
				Agent:       a,
				SessionMgr:  nil,
				Args:        cmdArgs,
				Verbose:     a.cfg.Verbose,
				Provider:    a.cfg.Provider,
				Model:       a.cfg.Model,
				PermMode:    permissions.Mode(a.cfg.Security),
				CostTracker: costTracker,
				IsPlanMode:  a.planMode,
			}

			// Handle plan mode transitions
			if cmdName == "plan" {
				if a.planMode {
					// Already in plan mode, just show plan info
				} else {
					a.EnterPlanMode()
					if a.cfg.Verbose {
						fmt.Println("[plan mode] entered (read-only)")
					}
				}
			}

			if err := cmdRegistry.Execute(cmdName, cmdCtx); err != nil {
				if err.Error() == "exit" {
					return nil
				}
				fmt.Printf("Error: %v\n", err)
			}
			continue
		}

		// Handle plan approval flow
		if a.planMode {
			if input == "approve" || input == "yes" || input == "y" {
				prevMode := a.ExitPlanMode()
				a.cfg.Security = string(prevMode)
				a.permChecker.SetMode(prevMode)
				fmt.Printf("[plan mode] Plan approved. Exited plan mode, restored to %s.\n", prevMode)
				fmt.Println("You can now proceed with implementation.")
				continue
			}

			if input == "edit" || strings.HasPrefix(input, "edit ") {
				editor := os.Getenv("EDITOR")
				if editor == "" {
					editor = "vi"
				}

				planPath := a.planManager.PlanPath()
				if planPath == "" {
					// Write plan to temp file
					planContent := a.planManager
					content := ""
					if pm := planContent; pm != nil {
						if pm.PlanExists() {
							content, _ = pm.ReadPlan()
						}
					}
					if content == "" {
						fmt.Println("No plan to edit.")
						continue
					}
				}

				cmd := exec.Command(editor, planPath)
				cmd.Stdin = os.Stdin
				cmd.Stdout = os.Stdout
				cmd.Stderr = os.Stderr
				if err := cmd.Run(); err != nil {
					fmt.Printf("Editor error: %v\n", err)
				} else {
					fmt.Println("Plan updated in editor.")
				}
				continue
			}

			// Any other input in plan mode is treated as feedback
			if input != "" {
				a.messages = append(a.messages, providers.Message{
					Role:    "user",
					Content: "Plan feedback: " + input,
				})
				fmt.Println("Feedback noted. Claude can revise the plan.")
			}
			continue
		}

		// Regular user message
		a.messages = append(a.messages, providers.Message{
			Role:    "user",
			Content: input,
		})

		a.messages = a.ctxMgr.Deduplicate(a.messages)
		a.messages = a.ctxMgr.Prune(a.messages, a.ctxMgr.maxTokens)

		if a.compactor.NeedsCompaction(a.messages) {
			a.messages = a.compactor.Compact(a.messages, a.planMode)
			if a.cfg.Verbose {
				fmt.Println("[compaction] context compacted")
			}
		}

		resp, err := a.chatWithFallback(ctx, a.messages, a.toolDefs())
		if err != nil {
			fmt.Printf("Error: %v\n", err)
			continue
		}

		costTracker.AddTokens(resp.Usage.InputTokens, resp.Usage.OutputTokens)

		if a.cfg.Verbose {
			fmt.Printf("[tokens] input=%d output=%d cost=$%.4f\n",
				resp.Usage.InputTokens, resp.Usage.OutputTokens,
				costTracker.TotalCost())
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
			for _, msg := range resp.Messages {
				if msg.ToolUse == nil && msg.Content != "" {
					fmt.Println(msg.Content)
				}
			}
			continue
		}

		a.executeToolsParallel(ctx, resp.Messages)

		for _, msg := range resp.Messages {
			if msg.ToolUse == nil && msg.Content != "" {
				fmt.Println(msg.Content)
			}
		}
	}

	return scanner.Err()
}
