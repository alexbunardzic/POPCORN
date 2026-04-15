CREATE TABLE IF NOT EXISTS tickets (
  id               SERIAL PRIMARY KEY,
  org_id           INTEGER NOT NULL REFERENCES organizations(id),
  created_by       INTEGER NOT NULL REFERENCES users(id),
  title            TEXT    NOT NULL,
  description      TEXT,
  "column"         TEXT    NOT NULL CHECK("column" IN (
                     'problems','options','possible','committed',
                     'ongoing','review','next')),
  position         INTEGER NOT NULL DEFAULT 0,
  action           TEXT,
  duration         TEXT,
  expected_outcome TEXT,
  hypothesis       TEXT,
  actual_results   TEXT,
  learning         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
