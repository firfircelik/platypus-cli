package tools

import (
	"context"
	"io"
	"net/http"
	"net/url"
	"strings"
)

type WebSearchTool struct{}

func NewWebSearch() *WebSearchTool { return &WebSearchTool{} }

func (t *WebSearchTool) Name() string        { return "WebSearch" }
func (t *WebSearchTool) Description() string { return "Search the web for information" }

func (t *WebSearchTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"query": map[string]any{
				"type":        "string",
				"description": "Search query",
			},
		},
		"required": []string{"query"},
	}
}

func (t *WebSearchTool) Execute(ctx context.Context, input map[string]any) (*Result, error) {
	query, _ := input["query"].(string)
	if query == "" {
		return &Result{Content: "Missing query parameter", IsError: true}, nil
	}

	searchURL := "https://html.duckduckgo.com/html/?q=" + url.QueryEscape(query)

	req, err := http.NewRequestWithContext(ctx, "GET", searchURL, nil)
	if err != nil {
		return &Result{Content: err.Error(), IsError: true}, nil
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")

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

	content := stripHTMLTags(string(body))
	if len(content) > 50000 {
		content = content[:50000] + "\n... (content truncated)"
	}

	return &Result{Content: content}, nil
}

func stripHTMLTags(html string) string {
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
