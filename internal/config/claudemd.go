package config

import (
	"os"
	"path/filepath"
	"strings"
)

type CLAUDEmd struct {
	Path    string
	Content string
	Type    string
}

func LoadCLAUDEmd(cwd string) ([]CLAUDEmd, error) {
	var results []CLAUDEmd

	paths := findCLAUDEmdPaths(cwd)
	for _, p := range paths {
		content, err := os.ReadFile(p)
		if err != nil {
			continue
		}
		if len(content) > 40000 {
			content = content[:40000]
		}

		results = append(results, CLAUDEmd{
			Path:    p,
			Content: string(content),
			Type:    classifyType(p, cwd),
		})
	}

	return results, nil
}

func findCLAUDEmdPaths(cwd string) []string {
	var paths []string

	dir := cwd
	for {
		candidates := []string{
			filepath.Join(dir, "CLAUDE.md"),
			filepath.Join(dir, ".claude", "CLAUDE.md"),
		}

		for _, c := range candidates {
			if _, err := os.Stat(c); err == nil {
				paths = append(paths, c)
			}
		}

		rulesDir := filepath.Join(dir, ".claude", "rules")
		if entries, err := os.ReadDir(rulesDir); err == nil {
			for _, entry := range entries {
				if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".md") {
					paths = append(paths, filepath.Join(rulesDir, entry.Name()))
				}
			}
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}

	home, err := os.UserHomeDir()
	if err == nil {
		homeCandidates := []string{
			filepath.Join(home, ".claude", "CLAUDE.md"),
		}
		for _, c := range homeCandidates {
			if _, err := os.Stat(c); err == nil {
				paths = append(paths, c)
			}
		}
	}

	return paths
}

func classifyType(path, cwd string) string {
	home, _ := os.UserHomeDir()
	if strings.HasPrefix(path, home) {
		return "user"
	}
	if strings.HasPrefix(path, cwd) {
		return "project"
	}
	return "parent"
}

func BuildSystemPromptFromCLAUDEmd(cwd string) string {
	docs, err := LoadCLAUDEmd(cwd)
	if err != nil || len(docs) == 0 {
		return ""
	}

	var sb strings.Builder
	sb.WriteString("# Project Instructions (from CLAUDE.md)\n\n")

	for _, doc := range docs {
		sb.WriteString("## " + doc.Path + " (" + doc.Type + ")\n\n")
		sb.WriteString(doc.Content)
		sb.WriteString("\n\n")
	}

	return sb.String()
}
