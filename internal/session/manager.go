package session

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	_ "modernc.org/sqlite"
)

type Manager struct {
	db        *sql.DB
	sessionID string
	cwd       string
	provider  string
	model     string
}

type SessionInfo struct {
	ID           string
	CWD          string
	Provider     string
	Model        string
	InputTokens  int
	OutputTokens int
	Cost         float64
	CreatedAt    time.Time
	LastModified time.Time
	Title        string
	Tag          string
}

func NewManager(dbPath string) (*Manager, error) {
	dir := filepath.Dir(dbPath)
	os.MkdirAll(dir, 0755)

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}

	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS sessions (
			id TEXT PRIMARY KEY,
			cwd TEXT,
			provider TEXT,
			model TEXT,
			input_tokens INTEGER DEFAULT 0,
			output_tokens INTEGER DEFAULT 0,
			cost REAL DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
			title TEXT,
			tag TEXT
		)
	`)
	if err != nil {
		return nil, err
	}

	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS messages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			session_id TEXT,
			role TEXT,
			content TEXT,
			tool_use_id TEXT,
			timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (session_id) REFERENCES sessions(id)
		)
	`)
	if err != nil {
		return nil, err
	}

	return &Manager{db: db}, nil
}

func (m *Manager) CreateSession(cwd, provider, model string) error {
	m.sessionID = uuid.New().String()
	m.cwd = cwd
	m.provider = provider
	m.model = model

	_, err := m.db.Exec(
		"INSERT INTO sessions (id, cwd, provider, model) VALUES (?, ?, ?, ?)",
		m.sessionID, cwd, provider, model,
	)
	return err
}

func (m *Manager) AddMessage(role, content, toolUseID string) error {
	if m.sessionID == "" {
		return fmt.Errorf("no active session")
	}

	_, err := m.db.Exec(
		"INSERT INTO messages (session_id, role, content, tool_use_id) VALUES (?, ?, ?, ?)",
		m.sessionID, role, content, toolUseID,
	)
	if err != nil {
		return err
	}

	_, err = m.db.Exec(
		"UPDATE sessions SET last_modified = CURRENT_TIMESTAMP WHERE id = ?",
		m.sessionID,
	)
	return err
}

func (m *Manager) UpdateTokens(input, output int, cost float64) error {
	_, err := m.db.Exec(
		"UPDATE sessions SET input_tokens = input_tokens + ?, output_tokens = output_tokens + ?, cost = cost + ? WHERE id = ?",
		input, output, cost, m.sessionID,
	)
	return err
}

func (m *Manager) GetSession(id string) (*SessionInfo, error) {
	var s SessionInfo
	err := m.db.QueryRow(
		"SELECT id, cwd, provider, model, input_tokens, output_tokens, cost, created_at, last_modified, title, tag FROM sessions WHERE id = ?",
		id,
	).Scan(&s.ID, &s.CWD, &s.Provider, &s.Model, &s.InputTokens, &s.OutputTokens, &s.Cost, &s.CreatedAt, &s.LastModified, &s.Title, &s.Tag)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (m *Manager) ListSessions(limit int) ([]SessionInfo, error) {
	rows, err := m.db.Query(
		"SELECT id, cwd, provider, model, input_tokens, output_tokens, cost, created_at, last_modified, title, tag FROM sessions ORDER BY last_modified DESC LIMIT ?",
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []SessionInfo
	for rows.Next() {
		var s SessionInfo
		if err := rows.Scan(&s.ID, &s.CWD, &s.Provider, &s.Model, &s.InputTokens, &s.OutputTokens, &s.Cost, &s.CreatedAt, &s.LastModified, &s.Title, &s.Tag); err != nil {
			return nil, err
		}
		sessions = append(sessions, s)
	}
	return sessions, nil
}

func (m *Manager) ResumeSession(id string) error {
	s, err := m.GetSession(id)
	if err != nil {
		return err
	}

	m.sessionID = s.ID
	m.cwd = s.CWD
	m.provider = s.Provider
	m.model = s.Model
	return nil
}

func (m *Manager) RenameSession(id, title string) error {
	_, err := m.db.Exec("UPDATE sessions SET title = ? WHERE id = ?", title, id)
	return err
}

func (m *Manager) TagSession(id, tag string) error {
	_, err := m.db.Exec("UPDATE sessions SET tag = ? WHERE id = ?", tag, id)
	return err
}

func (m *Manager) DeleteSession(id string) error {
	_, err := m.db.Exec("DELETE FROM messages WHERE session_id = ?", id)
	if err != nil {
		return err
	}
	_, err = m.db.Exec("DELETE FROM sessions WHERE id = ?", id)
	return err
}

func (m *Manager) GetMessages(sessionID string) ([]struct {
	Role      string
	Content   string
	ToolUseID string
}, error) {
	rows, err := m.db.Query(
		"SELECT role, content, tool_use_id FROM messages WHERE session_id = ? ORDER BY id ASC",
		sessionID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []struct {
		Role      string
		Content   string
		ToolUseID string
	}
	for rows.Next() {
		var m struct {
			Role      string
			Content   string
			ToolUseID string
		}
		if err := rows.Scan(&m.Role, &m.Content, &m.ToolUseID); err != nil {
			return nil, err
		}
		msgs = append(msgs, m)
	}
	return msgs, nil
}

func (m *Manager) Close() error {
	return m.db.Close()
}

func (m *Manager) SessionID() string {
	return m.sessionID
}
