-- Better Auth core schema (user/session/account/verification), matching the
-- installed better-auth@1.6.23 Zod schema in @better-auth/core/src/db/schema.
-- Default (non-plural, camelCase) model/column naming — see get-default-model-name.ts.
CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  image TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'staff', 'customer')),
  banned INTEGER NOT NULL DEFAULT 0,
  banReason TEXT,
  banExpires TEXT
);

CREATE INDEX IF NOT EXISTS user_role_idx ON user(role);

CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES user(id),
  expiresAt TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  ipAddress TEXT,
  userAgent TEXT,
  impersonatedBy TEXT
);

CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  providerId TEXT NOT NULL,
  accountId TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES user(id),
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt TEXT,
  refreshTokenExpiresAt TEXT,
  scope TEXT,
  password TEXT
);

CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  identifier TEXT NOT NULL
);

-- One-time site setup state (creates the first administrator account)
CREATE TABLE IF NOT EXISTS setup_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'complete')),
  createdAt TEXT NOT NULL,
  completedAt TEXT,
  adminUserId TEXT REFERENCES user(id) ON DELETE SET NULL
);
