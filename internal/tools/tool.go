package tools

import "context"

type Tool interface {
	Name() string
	Description() string
	Parameters() map[string]any
	Execute(ctx context.Context, input map[string]any) (*Result, error)
}

type Result struct {
	Content string
	IsError bool
}
