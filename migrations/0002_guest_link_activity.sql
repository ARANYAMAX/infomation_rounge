CREATE TABLE IF NOT EXISTS guest_link_activity (
  link_id TEXT PRIMARY KEY,
  language TEXT NOT NULL,
  checkin TEXT NOT NULL,
  checkout TEXT NOT NULL,
  issued_at TEXT,
  first_opened_at TEXT,
  last_opened_at TEXT,
  open_count INTEGER NOT NULL DEFAULT 0
);
