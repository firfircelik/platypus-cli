package permissions

import (
	"fmt"
	"strings"
)

type Mode string

const (
	Strict     Mode = "strict"
	Permissive Mode = "permissive"
	Bypass     Mode = "bypass"
)

type Decision struct {
	Allowed bool
	Reason  string
}

type PermissionChecker struct {
	mode           Mode
	allowedTools   map[string]bool
	deniedTools    map[string]bool
	destructiveOps map[string]bool
}

func NewPermissionChecker(mode Mode) *PermissionChecker {
	destructive := map[string]bool{
		"Bash":     true,
		"Write":    true,
		"Edit":     true,
		"WebFetch": false,
	}

	allowed := map[string]bool{
		"Read": true,
		"Grep": true,
		"Glob": true,
		"Tree": true,
	}

	return &PermissionChecker{
		mode:           mode,
		allowedTools:   allowed,
		destructiveOps: destructive,
	}
}

func (pc *PermissionChecker) Check(toolName string, input map[string]any) Decision {
	if pc.mode == Bypass {
		return Decision{Allowed: true, Reason: "bypass mode"}
	}

	if pc.allowedTools[toolName] {
		return Decision{Allowed: true, Reason: "read-only tool"}
	}

	if pc.mode == Permissive {
		return Decision{Allowed: true, Reason: "permissive mode"}
	}

	if pc.destructiveOps[toolName] {
		return Decision{
			Allowed: false,
			Reason:  fmt.Sprintf("Destructive tool '%s' requires approval in strict mode", toolName),
		}
	}

	return Decision{Allowed: true, Reason: "default allow"}
}

func (pc *PermissionChecker) SetMode(mode Mode) {
	pc.mode = mode
}

func ParseMode(s string) (Mode, error) {
	switch strings.ToLower(s) {
	case "strict":
		return Strict, nil
	case "permissive":
		return Permissive, nil
	case "bypass", "none":
		return Bypass, nil
	default:
		return "", fmt.Errorf("unknown permission mode: %s", s)
	}
}
