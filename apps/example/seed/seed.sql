INSERT OR IGNORE INTO catalog_items (id, name, description, price_cents, image_key, sku, category, custom_fields_json, updated_at) VALUES
  (1, 'Widget', 'A simple, reliable widget for everyday tasks.', 4500000, 'products/widget.svg', 'WDG-001', 'Equipment', '{"Material":"Aluminium","Warranty":"1 year"}', datetime('now')),
  (2, 'Gadget', 'A slightly fancier gadget with some extra sparkle.', 7500000, 'products/gadget.svg', 'GDG-002', 'Equipment', '{"Color":"Midnight","Weight":"320 g"}', datetime('now')),
  (3, 'Gizmo', 'The gizmo you did not know you needed.', 12000000, 'products/gizmo.svg', 'GZM-003', 'Gifts', '{"Edition":"Standard"}', datetime('now'));

INSERT OR IGNORE INTO inventory_item_stock (item_id, on_hand) VALUES
  (1, 24),
  (2, 12),
  (3, 8);
