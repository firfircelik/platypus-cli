package tools

import (
	"context"
	"io"
	"net/http"
	"strings"
)

type WebFetchTool struct{}

func NewWebFetch() *WebFetchTool { return &WebFetchTool{} }

func (t *WebFetchTool) Name() string        { return "WebFetch" }
func (t *WebFetchTool) Description() string { return "Fetch the contents of a URL" }

func (t *WebFetchTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"url": map[string]any{
				"type":        "string",
				"description": "URL to fetch",
			},
		},
		"required": []string{"url"},
	}
}

func (t *WebFetchTool) Execute(ctx context.Context, input map[string]any) (*Result, error) {
	url, _ := input["url"].(string)
	if url == "" {
		return &Result{Content: "Missing URL parameter", IsError: true}, nil
	}

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return &Result{Content: err.Error(), IsError: true}, nil
	}

	req.Header.Set("User-Agent", "Platypus/0.1.0")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return &Result{Content: err.Error(), IsError: true}, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return &Result{Content: "HTTP " + resp.Status, IsError: true}, nil
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 50000))
	if err != nil {
		return &Result{Content: err.Error(), IsError: true}, nil
	}

	content := string(body)
	content = stripHTML(content)

	if len(content) > 50000 {
		content = content[:50000] + "\n... (content truncated)"
	}

	return &Result{Content: content}, nil
}

func stripHTML(html string) string {
	var result strings.Builder
	inTag := false
	for _, r := range html {
		if r == '<' {
			inTag = true
			continue
		}
		if r == '>' {
			inTag = false
			continue
		}
		if !inTag {
			result.WriteRune(r)
		}
	}
	return strings.TrimSpace(result.String())
}
