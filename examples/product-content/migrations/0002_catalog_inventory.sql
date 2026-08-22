-- Split out from catalog_items so a client without the inventory module
-- never has a stock column to leave orphaned. The `on_hand >= 0` CHECK is
-- what makes an overdraft abort the whole db.batch() atomically — see
-- src/lib/inventory-hooks.ts, which is the only code that writes here.
CREATE TABLE IF NOT EXISTS inventory_item_stock (
  item_id INTEGER PRIMARY KEY REFERENCES catalog_items(id),
  on_hand INTEGER NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES catalog_items(id),
  order_id INTEGER REFERENCES orders(id),
  quantity_change INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('sale', 'cancelled_order', 'manual_adjustment')),
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS inventory_movements_item_id_index ON inventory_movements(item_id);
