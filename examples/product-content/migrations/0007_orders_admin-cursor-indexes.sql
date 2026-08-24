CREATE INDEX IF NOT EXISTS idx_orders_admin_cursor
  ON orders(created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_orders_admin_status_cursor
  ON orders(status, created_at DESC, id DESC);
