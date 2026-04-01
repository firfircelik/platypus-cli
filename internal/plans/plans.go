package plans

import (
	"fmt"
	"math/rand"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type Manager struct {
	dir      string
	slug     string
	planFile string
}

var wordList = []string{
	"swift", "calm", "bold", "keen", "wise",
	"cool", "warm", "fast", "deep", "bright",
	"otter", "breeze", "stone", "leaf", "wave",
	"flame", "cloud", "rain", "snow", "wind",
	"tiger", "eagle", "wolf", "bear", "hawk",
	"fox", "lynx", "deer", "crane", "dove",
}

func NewManager() *Manager {
	dir := defaultPlansDir()
	return &Manager{dir: dir}
}

func defaultPlansDir() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ".platypus/plans"
	}
	return filepath.Join(home, ".platypus", "plans")
}

func (m *Manager) EnsureDir() error {
	return os.MkdirAll(m.dir, 0755)
}

func (m *Manager) GenerateSlug() string {
	if m.slug != "" {
		return m.slug
	}

	rand.Seed(time.Now().UnixNano())
	for i := 0; i < 10; i++ {
		w1 := wordList[rand.Intn(len(wordList)/2)]
		w2 := wordList[len(wordList)/2+rand.Intn(len(wordList)/2)]
		slug := w1 + "-" + w2
		path := filepath.Join(m.dir, slug+".md")
		if _, err := os.Stat(path); os.IsNotExist(err) {
			m.slug = slug
			m.planFile = path
			return slug
		}
	}

	m.slug = fmt.Sprintf("plan-%d", time.Now().Unix())
	m.planFile = filepath.Join(m.dir, m.slug+".md")
	return m.slug
}

func (m *Manager) WritePlan(content string) error {
	if err := m.EnsureDir(); err != nil {
		return err
	}

	if m.planFile == "" {
		m.GenerateSlug()
	}

	return os.WriteFile(m.planFile, []byte(content), 0644)
}

func (m *Manager) ReadPlan() (string, error) {
	if m.planFile == "" {
		return "", fmt.Errorf("no plan file")
	}

	content, err := os.ReadFile(m.planFile)
	if err != nil {
		return "", err
	}

	return string(content), nil
}

func (m *Manager) PlanExists() bool {
	if m.planFile == "" {
		return false
	}
	_, err := os.Stat(m.planFile)
	return err == nil
}

func (m *Manager) PlanPath() string {
	return m.planFile
}

func (m *Manager) PlanSlug() string {
	return m.slug
}

func (m *Manager) Clear() {
	m.slug = ""
	m.planFile = ""
}

func FormatPlan(title string, sections []PlanSection) string {
	var sb strings.Builder
	sb.WriteString("# " + title + "\n\n")
	for i, section := range sections {
		sb.WriteString(fmt.Sprintf("## %d. %s\n\n", i+1, section.Title))
		sb.WriteString(section.Content)
		sb.WriteString("\n\n")
	}
	return sb.String()
}

type PlanSection struct {
	Title   string
	Content string
}
