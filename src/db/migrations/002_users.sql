CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id        INTEGER NOT NULL REFERENCES organizations(id),
  email         TEXT    NOT NULL,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL CHECK(role IN ('admin', 'member')),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(org_id, email)
);
