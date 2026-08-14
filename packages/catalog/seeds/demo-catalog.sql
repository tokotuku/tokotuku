-- Demo catalog data for `tokotuku db seed`. Idempotent via the sku unique
-- index (catalog_items_sku_unique), not explicit ids -- an explicit id
-- would collide with AUTOINCREMENT on real rows an admin later creates.
INSERT OR IGNORE INTO catalog_items (name, description, price_cents, image_key, sku, category, custom_fields_json) VALUES
  ('Widget', 'A simple, reliable widget for everyday tasks.', 4500000, 'products/widget.svg', 'WDG-001', 'Equipment', '{"Material":"Aluminium","Warranty":"1 year"}'),
  ('Gadget', 'A slightly fancier gadget with some extra sparkle.', 7500000, 'products/gadget.svg', 'GDG-002', 'Equipment', '{"Color":"Midnight","Weight":"320 g"}'),
  ('Gizmo', 'The gizmo you did not know you needed.', 12000000, 'products/gizmo.svg', 'GZM-003', 'Gifts', '{"Edition":"Standard"}');

INSERT OR IGNORE INTO inventory_item_stock (item_id, on_hand)
  SELECT id, 24 FROM catalog_items WHERE sku = 'WDG-001'
  UNION ALL
  SELECT id, 12 FROM catalog_items WHERE sku = 'GDG-002'
  UNION ALL
  SELECT id, 8 FROM catalog_items WHERE sku = 'GZM-003';
