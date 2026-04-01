package keybindings

import (
	"encoding/json"
	"os"
	"path/filepath"
)

type Keybinding struct {
	Key     string `json:"key"`
	Action  string `json:"action"`
	Context string `json:"context,omitempty"`
}

type Config struct {
	Bindings []Keybinding `json:"bindings"`
}

var DefaultBindings = []Keybinding{
	{Key: "Ctrl+D", Action: "send", Context: "input"},
	{Key: "Esc", Action: "quit", Context: "global"},
	{Key: "Ctrl+C", Action: "cancel", Context: "global"},
	{Key: "Ctrl+L", Action: "clear", Context: "global"},
	{Key: "Up", Action: "history_prev", Context: "input"},
	{Key: "Down", Action: "history_next", Context: "input"},
	{Key: "Tab", Action: "autocomplete", Context: "input"},
	{Key: "Ctrl+K", Action: "clear_input", Context: "input"},
	{Key: "Ctrl+R", Action: "search_history", Context: "input"},
	{Key: "PageUp", Action: "scroll_up", Context: "output"},
	{Key: "PageDown", Action: "scroll_down", Context: "output"},
}

func LoadConfig(path string) (*Config, error) {
	if _, err := os.Stat(path); err != nil {
		return &Config{Bindings: DefaultBindings}, nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}

func SaveConfig(path string, cfg *Config) error {
	dir := filepath.Dir(path)
	os.MkdirAll(dir, 0755)

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, data, 0644)
}

func GetBinding(cfg *Config, key, context string) *Keybinding {
	for _, b := range cfg.Bindings {
		if b.Key == key && (b.Context == "" || b.Context == context) {
			return &b
		}
	}
	return nil
}

func DefaultConfigPath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ".platypus/keybindings.json"
	}
	return filepath.Join(home, ".platypus", "keybindings.json")
}
