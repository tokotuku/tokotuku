INSERT OR IGNORE INTO products (id, name, description, price_cents, image_key, sku, category, stock, custom_fields_json, updated_at) VALUES
  (1, 'Widget', 'A simple, reliable widget for everyday tasks.', 1999, 'products/widget.svg', 'WDG-001', 'Equipment', 24, '{"Material":"Aluminium","Warranty":"1 year"}', datetime('now')),
  (2, 'Gadget', 'A slightly fancier gadget with some extra sparkle.', 2999, 'products/gadget.svg', 'GDG-002', 'Equipment', 12, '{"Color":"Midnight","Weight":"320 g"}', datetime('now')),
  (3, 'Gizmo', 'The gizmo you did not know you needed.', 4999, 'products/gizmo.svg', 'GZM-003', 'Gifts', 8, '{"Edition":"Standard"}', datetime('now'));
