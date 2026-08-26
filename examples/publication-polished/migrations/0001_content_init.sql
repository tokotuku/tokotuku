-- Editorial posts. Slugs are normalized by the module before writes and the
-- expression index also protects callers that write directly through D1.
CREATE TABLE IF NOT EXISTS content_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL CHECK (
    slug <> '' AND slug = lower(slug) AND slug NOT GLOB '*[^a-z0-9-]*'
    AND slug NOT GLOB '-*' AND slug NOT GLOB '*-'
  ),
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  body_markdown TEXT NOT NULL DEFAULT '',
  cover_image_key TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  author_id TEXT REFERENCES user(id) ON DELETE SET NULL,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS content_posts_slug_unique ON content_posts(lower(slug));
CREATE INDEX IF NOT EXISTS content_posts_public_idx
  ON content_posts(status, published_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS content_posts_admin_idx
  ON content_posts(status, updated_at DESC, id DESC);
