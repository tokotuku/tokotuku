-- Track allocation state independently from the movement ledger so a
-- concurrent status transition cannot reserve or restore stock twice.
CREATE TABLE IF NOT EXISTS inventory_order_allocations (
  order_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('allocated', 'released')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (order_id, item_id)
);

-- Existing sale movements represent reservations made before this migration.
-- Keep them allocated so a later confirmation does not decrement stock twice.
INSERT OR IGNORE INTO inventory_order_allocations (order_id, item_id, state)
SELECT order_id, item_id,
       CASE WHEN SUM(quantity_change) < 0 THEN 'allocated' ELSE 'released' END
FROM inventory_movements
WHERE order_id IS NOT NULL
GROUP BY order_id, item_id;

CREATE INDEX IF NOT EXISTS inventory_order_allocations_state_index
  ON inventory_order_allocations(state, updated_at);
