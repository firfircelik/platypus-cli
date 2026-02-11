import Database from 'better-sqlite3'
import { getStateDbPath } from '../core/paths.js'

let db: Database.Database | null = null

export function getStateDb(): Database.Database {
  if (db) return db
  db = new Database(getStateDbPath())
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      capabilities TEXT NOT NULL,
      session_id TEXT NOT NULL,
      session_name TEXT NOT NULL,
      pane_id TEXT NOT NULL,
      state TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_activity TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS file_locks (
      file_path TEXT PRIMARY KEY,
      lock_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      acquired_at TEXT NOT NULL,
      expires_at TEXT
    );

    CREATE TABLE IF NOT EXISTS conflicts (
      id TEXT PRIMARY KEY,
      file_path TEXT NOT NULL,
      agents TEXT NOT NULL,
      detected_at TEXT NOT NULL,
      resolution TEXT
    );

    CREATE TABLE IF NOT EXISTS agent_tasks (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_task_results (
      task_id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      status TEXT NOT NULL,
      output TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workflow_runs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      root TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workflow_steps (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      input TEXT,
      output TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)
  return db
}

export function resetStateDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
