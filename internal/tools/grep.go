package tools

import (
	"bufio"
	"context"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

type GrepTool struct{}

func NewGrep() *GrepTool { return &GrepTool{} }

func (t *GrepTool) Name() string        { return "Grep" }
func (t *GrepTool) Description() string { return "Search for a pattern in files" }

func (t *GrepTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"pattern": map[string]any{
				"type":        "string",
				"description": "Regex pattern to search for",
			},
			"path": map[string]any{
				"type":        "string",
				"description": "File or directory to search in",
			},
		},
		"required": []string{"pattern"},
	}
}

func (t *GrepTool) Execute(ctx context.Context, input map[string]any) (*Result, error) {
	pattern, _ := input["pattern"].(string)
	searchPath, _ := input["path"].(string)
	if searchPath == "" {
		searchPath = "."
	}

	re, err := regexp.Compile(pattern)
	if err != nil {
		return &Result{Content: "Invalid regex: " + err.Error(), IsError: true}, nil
	}

	var matches []string
	err = filepath.Walk(searchPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || info.Size() > 10*1024*1024 {
			return nil
		}
		file, err := os.Open(path)
		if err != nil {
			return nil
		}
		defer file.Close()

		scanner := bufio.NewScanner(file)
		lineNum := 0
		for scanner.Scan() {
			lineNum++
			if re.MatchString(scanner.Text()) {
				matches = append(matches, path+":"+strconv.Itoa(lineNum)+":"+scanner.Text())
			}
			if len(matches) >= 100 {
				break
			}
		}
		return nil
	})
	if err != nil {
		return &Result{Content: err.Error(), IsError: true}, nil
	}

	if len(matches) == 0 {
		return &Result{Content: "No matches found"}, nil
	}

	result := strings.Join(matches, "\n")
	if len(result) > 50000 {
		result = result[:50000] + "\n... (output truncated)"
	}

	return &Result{Content: result}, nil
}
