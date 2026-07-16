CREATE TABLE IF NOT EXISTS setup_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'complete')),
  createdAt TEXT NOT NULL,
  completedAt TEXT,
  adminUserId TEXT REFERENCES user(id) ON DELETE SET NULL
);
