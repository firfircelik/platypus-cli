package skills

import (
	"os"
	"path/filepath"
	"strings"
)

type Skill struct {
	Name        string
	Description string
	Content     string
	Path        string
}

func LoadSkills(paths []string) ([]Skill, error) {
	var skills []Skill

	for _, path := range paths {
		entries, err := os.ReadDir(path)
		if err != nil {
			continue
		}

		for _, entry := range entries {
			if entry.IsDir() {
				skillPath := filepath.Join(path, entry.Name(), "SKILL.md")
				if _, err := os.Stat(skillPath); err == nil {
					content, err := os.ReadFile(skillPath)
					if err != nil {
						continue
					}

					name := entry.Name()
					description := extractDescription(string(content))

					skills = append(skills, Skill{
						Name:        name,
						Description: description,
						Content:     string(content),
						Path:        skillPath,
					})
				}
			}
		}
	}

	return skills, nil
}

func extractDescription(content string) string {
	lines := strings.Split(content, "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "description:") {
			return strings.Trim(strings.TrimPrefix(line, "description:"), " \"'")
		}
		if strings.HasPrefix(line, "---") {
			break
		}
	}
	return ""
}

func FindSkillPaths() []string {
	var paths []string

	home, err := os.UserHomeDir()
	if err == nil {
		paths = append(paths, filepath.Join(home, ".platypus", "skills"))
	}

	cwd, err := os.Getwd()
	if err == nil {
		paths = append(paths, filepath.Join(cwd, ".platypus", "skills"))
		paths = append(paths, filepath.Join(cwd, ".claude", "skills"))
	}

	return paths
}

func MatchSkill(content string, skills []Skill) *Skill {
	contentLower := strings.ToLower(content)
	for _, skill := range skills {
		if strings.Contains(contentLower, strings.ToLower(skill.Name)) {
			return &skill
		}
	}
	return nil
}
