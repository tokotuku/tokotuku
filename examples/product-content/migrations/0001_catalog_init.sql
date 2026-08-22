-- Sellable/showable items. price_cents is nullable and fulfillment_type is
-- unconstrained TEXT so a quote-only service item (no fixed price, fulfilled
-- as a project rather than shipped) can live in the same table as a physical
-- product — a-la-carte modules gate what they show via capability checks,
-- not via a CHECK on this column. Stock is NOT this table's concern; it
-- lives in inventory_item_stock, a table owned by the (optional) inventory
-- module and keyed by item_id.
CREATE TABLE IF NOT EXISTS catalog_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_cents INTEGER CHECK (price_cents IS NULL OR price_cents >= 0),
  fulfillment_type TEXT NOT NULL DEFAULT 'physical',
  image_key TEXT NOT NULL,
  sku TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  custom_fields_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS catalog_items_sku_unique ON catalog_items(sku);
