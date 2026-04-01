package swarm

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type Mailbox struct {
	mu      sync.RWMutex
	mailDir string
}

type Message struct {
	From      string    `json:"from"`
	To        string    `json:"to"`
	Type      string    `json:"type"`
	Payload   string    `json:"payload"`
	Timestamp time.Time `json:"timestamp"`
	ID        string    `json:"id"`
}

func NewMailbox(mailDir string) *Mailbox {
	os.MkdirAll(mailDir, 0755)
	return &Mailbox{mailDir: mailDir}
}

func DefaultMailDir() string {
	home, _ := os.UserHomeDir()
	if home == "" {
		return ".platypus/mailbox"
	}
	return filepath.Join(home, ".platypus", "mailbox")
}

func (m *Mailbox) Send(msg Message) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	msg.Timestamp = time.Now()
	msg.ID = fmt.Sprintf("%s-%d", msg.From, time.Now().UnixNano())

	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	destDir := filepath.Join(m.mailDir, msg.To)
	os.MkdirAll(destDir, 0755)

	path := filepath.Join(destDir, msg.ID+".json")
	return os.WriteFile(path, data, 0644)
}

func (m *Mailbox) Receive(to string) ([]Message, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	destDir := filepath.Join(m.mailDir, to)
	entries, err := os.ReadDir(destDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	var messages []Message
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".json" {
			continue
		}

		data, err := os.ReadFile(filepath.Join(destDir, entry.Name()))
		if err != nil {
			continue
		}

		var msg Message
		if err := json.Unmarshal(data, &msg); err != nil {
			continue
		}

		messages = append(messages, msg)
	}

	return messages, nil
}

func (m *Mailbox) Clear(to string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	destDir := filepath.Join(m.mailDir, to)
	return os.RemoveAll(destDir)
}

func (m *Mailbox) PendingCount(to string) int {
	messages, _ := m.Receive(to)
	return len(messages)
}
