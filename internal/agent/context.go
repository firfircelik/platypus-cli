package agent

import "github.com/firfircelik/platypus-cli/internal/agent/providers"

type ContextManager struct {
	maxTokens     int
	currentTokens int
}

func NewContextManager(maxTokens int) *ContextManager {
	return &ContextManager{maxTokens: maxTokens}
}

func (cm *ContextManager) EstimateTokens(messages []providers.Message) int {
	total := 0
	for _, msg := range messages {
		total += len(msg.Content) / 4
		if msg.ToolUse != nil {
			total += 50
		}
	}
	cm.currentTokens = total
	return total
}

func (cm *ContextManager) Prune(messages []providers.Message, budget int) []providers.Message {
	if len(messages) <= 3 {
		return messages
	}

	estimated := cm.EstimateTokens(messages)
	if estimated <= budget {
		return messages
	}

	pruned := []providers.Message{messages[0]}

	for i := 1; i < len(messages)-1; i++ {
		msg := messages[i]
		if msg.Role == "tool" && msg.ToolUse != nil {
			pruned = append(pruned, providers.Message{
				Role:    "tool",
				Content: "[result omitted]",
				ToolUse: msg.ToolUse,
			})
			continue
		}
		pruned = append(pruned, msg)
	}

	pruned = append(pruned, messages[len(messages)-1])
	return pruned
}

func (cm *ContextManager) Deduplicate(messages []providers.Message) []providers.Message {
	seen := make(map[string]bool)
	var deduped []providers.Message
	for _, msg := range messages {
		key := msg.Role + ":" + msg.Content[:min(len(msg.Content), 100)]
		if seen[key] && msg.Role == "tool" {
			continue
		}
		seen[key] = true
		deduped = append(deduped, msg)
	}
	return deduped
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
