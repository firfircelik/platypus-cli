package session

import (
	"database/sql"
	"time"

	_ "modernc.org/sqlite"
)

type Storage struct {
	db *sql.DB
}

type Session struct {
	ID           string
	Provider     string
	Model        string
	InputTokens  int
	OutputTokens int
	Cost         float64
	CreatedAt    time.Time
}

func NewStorage(path string) (*Storage, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}

	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS sessions (
			id TEXT PRIMARY KEY,
			provider TEXT,
			model TEXT,
			input_tokens INTEGER DEFAULT 0,
			output_tokens INTEGER DEFAULT 0,
			cost REAL DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

	return &Storage{db: db}, nil
}

func (s *Storage) CreateSession(session *Session) error {
	_, err := s.db.Exec(
		"INSERT INTO sessions (id, provider, model, input_tokens, output_tokens, cost) VALUES (?, ?, ?, ?, ?, ?)",
		session.ID, session.Provider, session.Model, session.InputTokens, session.OutputTokens, session.Cost,
	)
	return err
}

func (s *Storage) AddMessage(sessionID, role, content, toolUseID string) error {
	_, err := s.db.Exec(
		"INSERT INTO messages (session_id, role, content, tool_use_id) VALUES (?, ?, ?, ?)",
		sessionID, role, content, toolUseID,
	)
	return err
}

func (s *Storage) GetSession(id string) (*Session, error) {
	var sess Session
	err := s.db.QueryRow(
		"SELECT id, provider, model, input_tokens, output_tokens, cost, created_at FROM sessions WHERE id = ?",
		id,
	).Scan(&sess.ID, &sess.Provider, &sess.Model, &sess.InputTokens, &sess.OutputTokens, &sess.Cost, &sess.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &sess, nil
}

func (s *Storage) Close() error {
	return s.db.Close()
}
