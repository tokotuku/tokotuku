-- Extension table for project/quote-based fulfillment (catalog_items.
-- fulfillment_type = 'project'). Nothing writes to this yet — the
-- quote-intake flow lands in stage 3 — but the seam exists now so the
-- schema doesn't need a breaking change when it does.
CREATE TABLE IF NOT EXISTS projects_item_scope (
  item_id INTEGER PRIMARY KEY REFERENCES catalog_items(id),
  intake_form_json TEXT NOT NULL DEFAULT '{}',
  pricing_mode TEXT NOT NULL DEFAULT 'quote',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
