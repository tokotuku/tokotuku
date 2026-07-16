ALTER TABLE products ADD COLUMN sku TEXT;
ALTER TABLE products ADD COLUMN category TEXT NOT NULL DEFAULT 'General';
ALTER TABLE products ADD COLUMN stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0);
ALTER TABLE products ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1));
ALTER TABLE products ADD COLUMN custom_fields_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE products ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';

UPDATE products
SET
  sku = 'SKU-' || printf('%04d', id),
  stock = 20,
  updated_at = datetime('now')
WHERE sku IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON products(sku);

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
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method = 'cash'),
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
  VALUES (NEW.product_id, NEW.order_id, -NEW.quantity, 'sale', 'Stock reserved for cash order');
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
