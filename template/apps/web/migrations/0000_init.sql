CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  image_key TEXT NOT NULL,
  sku TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  custom_fields_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON products(sku);

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

-- One-time store setup state (creates the first administrator account)
CREATE TABLE IF NOT EXISTS setup_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'complete')),
  createdAt TEXT NOT NULL,
  completedAt TEXT,
  adminUserId TEXT REFERENCES user(id) ON DELETE SET NULL
);

-- Commerce: orders, order items, inventory movements
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_postal_code TEXT NOT NULL,
  customer_note TEXT NOT NULL DEFAULT '',
  subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  shipping_cents INTEGER NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer')),
  payment_proof_key TEXT,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'delivered', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS orders_user_id_index ON orders(user_id);
CREATE INDEX IF NOT EXISTS orders_created_at_index ON orders(created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total_cents INTEGER NOT NULL CHECK (line_total_cents >= 0)
);

CREATE INDEX IF NOT EXISTS order_items_order_id_index ON order_items(order_id);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  order_id INTEGER REFERENCES orders(id),
  quantity_change INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('sale', 'cancelled_order', 'manual_adjustment')),
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TRIGGER IF NOT EXISTS order_item_stock_guard
BEFORE INSERT ON order_items
BEGIN
  SELECT CASE
    WHEN COALESCE((SELECT stock FROM products WHERE id = NEW.product_id AND is_active = 1), -1) < NEW.quantity
    THEN RAISE(ABORT, 'insufficient_stock')
  END;
END;

CREATE TRIGGER IF NOT EXISTS order_item_decrease_stock
AFTER INSERT ON order_items
BEGIN
  UPDATE products
  SET stock = stock - NEW.quantity, updated_at = datetime('now')
  WHERE id = NEW.product_id;

  INSERT INTO inventory_movements (product_id, order_id, quantity_change, reason, note)
  VALUES (NEW.product_id, NEW.order_id, -NEW.quantity, 'sale', 'Stock reserved for order');
END;

CREATE TRIGGER IF NOT EXISTS cancelled_order_restore_stock
AFTER UPDATE OF status ON orders
WHEN NEW.status = 'cancelled' AND OLD.status != 'cancelled'
BEGIN
  UPDATE products
  SET stock = stock + COALESCE((SELECT SUM(quantity) FROM order_items WHERE order_id = NEW.id AND product_id = products.id), 0),
      updated_at = datetime('now')
  WHERE id IN (SELECT product_id FROM order_items WHERE order_id = NEW.id);

  INSERT INTO inventory_movements (product_id, order_id, quantity_change, reason, note)
  SELECT product_id, NEW.id, quantity, 'cancelled_order', 'Stock restored after order cancellation'
  FROM order_items
  WHERE order_id = NEW.id;
END;
