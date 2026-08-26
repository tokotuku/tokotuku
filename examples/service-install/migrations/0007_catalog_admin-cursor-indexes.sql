CREATE INDEX IF NOT EXISTS idx_catalog_items_admin_cursor
  ON catalog_items(is_active, category, id DESC);
