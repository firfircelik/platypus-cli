package agent

import (
	"strings"

	"github.com/firfircelik/platypus-cli/internal/agent/providers"
)

type Compactor struct {
	maxTokens    int
	bufferTokens int
}

func NewCompactor(maxTokens int) *Compactor {
	return &Compactor{
		maxTokens:    maxTokens,
		bufferTokens: 13000,
	}
}

func (c *Compactor) NeedsCompaction(messages []providers.Message) bool {
	estimated := estimateTokens(messages)
	return estimated > (c.maxTokens - c.bufferTokens)
}

func (c *Compactor) Compact(messages []providers.Message, planMode ...bool) []providers.Message {
	if len(messages) <= 5 {
		return messages
	}

	pm := false
	if len(planMode) > 0 {
		pm = planMode[0]
	}

	compacted := []providers.Message{messages[0]}

	var summary strings.Builder
	summary.WriteString("[Previous conversation summarized]\n")

	for i := 1; i < len(messages)-3; i++ {
		msg := messages[i]
		if msg.Role == "assistant" && msg.ToolUse == nil && msg.Content != "" {
			firstLine := msg.Content
			if idx := strings.Index(firstLine, "\n"); idx > 0 {
				firstLine = firstLine[:idx]
			}
			if len(firstLine) > 100 {
				firstLine = firstLine[:100] + "..."
			}
			summary.WriteString("- Assistant: " + firstLine + "\n")
		} else if msg.Role == "tool" && msg.ToolUse != nil {
			summary.WriteString("- Tool result: " + msg.ToolUse.ID + "\n")
		}
	}

	compacted = append(compacted, providers.Message{
		Role:    "assistant",
		Content: summary.String(),
	})

	if pm {
		compacted = append(compacted, providers.Message{
			Role:    "user",
			Content: "Plan mode is active. You MUST NOT make any edits, run any non-readonly tools, or otherwise make any changes to the system. Only read files and write the plan file.",
		})
	}

	for _, msg := range messages[len(messages)-3:] {
		compacted = append(compacted, msg)
	}

	return compacted
}

func estimateTokens(messages []providers.Message) int {
	total := 0
	for _, msg := range messages {
		total += len(msg.Content) / 4
		if msg.ToolUse != nil {
			total += 50
		}
	}
	return total
}
