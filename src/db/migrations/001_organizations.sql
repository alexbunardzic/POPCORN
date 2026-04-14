CREATE TABLE IF NOT EXISTS organizations (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT    NOT NULL,
  slug      TEXT    NOT NULL UNIQUE,
  wip_limit INTEGER NOT NULL DEFAULT 3,
  created_at TEXT   NOT NULL DEFAULT (datetime('now'))
);
