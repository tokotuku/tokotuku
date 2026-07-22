PRAGMA foreign_keys=OFF;

CREATE TABLE orders_new (
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

INSERT INTO orders_new (
  id, order_number, user_id, customer_name, customer_email, customer_phone,
  shipping_address, shipping_city, shipping_postal_code, customer_note,
  subtotal_cents, shipping_cents, total_cents, payment_method, payment_proof_key,
  payment_status, status, created_at, updated_at
)
SELECT
  id, order_number, user_id, customer_name, customer_email, customer_phone,
  shipping_address, shipping_city, shipping_postal_code, customer_note,
  subtotal_cents, shipping_cents, total_cents, payment_method, NULL,
  payment_status, status, created_at, updated_at
FROM orders;

DROP TABLE orders;
ALTER TABLE orders_new RENAME TO orders;

CREATE INDEX IF NOT EXISTS orders_user_id_index ON orders(user_id);
CREATE INDEX IF NOT EXISTS orders_created_at_index ON orders(created_at DESC);

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

PRAGMA foreign_keys=ON;
