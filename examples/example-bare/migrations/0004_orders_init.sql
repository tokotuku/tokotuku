-- user_id/customer_email/subtotal_cents/total_cents are nullable: an
-- inquiry lead (WhatsApp, a project quote request) is not logged in and has
-- no computed total until it is quoted. `source` records which channel
-- created the order for lead reporting.
--
-- No CHECK on `status` or `payment_status` — both are lifecycle vocabulary
-- that will grow new values as more fulfillment types land (e.g. `quoted`,
-- `partial`), and SQLite cannot ALTER a CHECK in place. Legality of a
-- transition is validated in TypeScript, where it can actually change
-- without a table rebuild. CHECK stays only for true invariants (>= 0).
--
-- `payment_method` does not exist here: which adapter was used is implied
-- by which adapter-owned table has a row for this order (see
-- payments_bank_transfer_proofs). `payment_status`/`paid_cents` are the one
-- deliberate exception living on core orders rather than a payment module's
-- table — "paid or not" is a property of the order, settleable manually by
-- an admin with no payment module installed at all.
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'web',
  user_id TEXT REFERENCES user(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_postal_code TEXT NOT NULL,
  customer_note TEXT NOT NULL DEFAULT '',
  subtotal_cents INTEGER CHECK (subtotal_cents IS NULL OR subtotal_cents >= 0),
  shipping_cents INTEGER NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  total_cents INTEGER CHECK (total_cents IS NULL OR total_cents >= 0),
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  paid_cents INTEGER CHECK (paid_cents IS NULL OR paid_cents >= 0),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS orders_user_id_index ON orders(user_id);
CREATE INDEX IF NOT EXISTS orders_created_at_index ON orders(created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES catalog_items(id),
  product_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  price_cents INTEGER CHECK (price_cents IS NULL OR price_cents >= 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  line_total_cents INTEGER CHECK (line_total_cents IS NULL OR line_total_cents >= 0)
);

CREATE INDEX IF NOT EXISTS order_items_order_id_index ON order_items(order_id);
