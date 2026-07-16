ALTER TABLE user ADD COLUMN role TEXT NOT NULL DEFAULT 'customer'
  CHECK (role IN ('admin', 'staff', 'customer'));
ALTER TABLE user ADD COLUMN banned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user ADD COLUMN banReason TEXT;
ALTER TABLE user ADD COLUMN banExpires TEXT;

ALTER TABLE session ADD COLUMN impersonatedBy TEXT;

CREATE INDEX IF NOT EXISTS user_role_idx ON user(role);
