ALTER TABLE booking_order_bookings ADD COLUMN submission_fingerprint TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS booking_submission_fingerprint_index
  ON booking_order_bookings(submission_fingerprint)
  WHERE submission_fingerprint IS NOT NULL;

CREATE TABLE IF NOT EXISTS booking_submission_limits (
  client_key TEXT PRIMARY KEY,
  short_window INTEGER NOT NULL,
  short_count INTEGER NOT NULL CHECK (short_count BETWEEN 1 AND 5),
  day_window TEXT NOT NULL,
  day_count INTEGER NOT NULL CHECK (day_count BETWEEN 1 AND 20),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS booking_submission_limits_last_seen_index
  ON booking_submission_limits(last_seen_at);
