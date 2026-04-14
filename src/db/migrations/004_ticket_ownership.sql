ALTER TABLE tickets ADD COLUMN parent_id INTEGER REFERENCES tickets(id);
ALTER TABLE tickets ADD COLUMN owner      TEXT;
ALTER TABLE tickets ADD COLUMN status     TEXT NOT NULL DEFAULT 'open'
  CHECK(status IN ('open','blocked','done'));
