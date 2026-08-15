-- Premium local catalog fixture. This seed only creates catalog rows and
-- inventory; sales, customers, revenue, and orders remain real-only.
--
-- Migrate the three original starter rows only while they still exactly match
-- the package fixture. A user who edited one of them keeps their row/ID.
UPDATE inventory_item_stock SET on_hand = 24, updated_at = datetime('now')
WHERE item_id IN (SELECT id FROM catalog_items WHERE sku = 'WDG-001' AND name = 'Widget' AND description = 'A simple, reliable widget for everyday tasks.' AND price_cents = 4500000 AND image_key = 'products/widget.svg' AND category = 'Equipment' AND custom_fields_json = '{"Material":"Aluminium","Warranty":"1 year"}');
UPDATE inventory_item_stock SET on_hand = 12, updated_at = datetime('now')
WHERE item_id IN (SELECT id FROM catalog_items WHERE sku = 'GDG-002' AND name = 'Gadget' AND description = 'A slightly fancier gadget with some extra sparkle.' AND price_cents = 7500000 AND image_key = 'products/gadget.svg' AND category = 'Equipment' AND custom_fields_json = '{"Color":"Midnight","Weight":"320 g"}');
UPDATE inventory_item_stock SET on_hand = 8, updated_at = datetime('now')
WHERE item_id IN (SELECT id FROM catalog_items WHERE sku = 'GZM-003' AND name = 'Gizmo' AND description = 'The gizmo you did not know you needed.' AND price_cents = 12000000 AND image_key = 'products/gizmo.svg' AND category = 'Gifts' AND custom_fields_json = '{"Edition":"Standard"}');

UPDATE catalog_items
SET name = 'Cangkir Stoneware', description = 'Cangkir stoneware berbintik dengan siluet nyaman untuk kopi atau teh.', price_cents = 280000000, image_key = 'products/cangkir-stoneware.webp', sku = 'TOKO-CANGKIR-001', category = 'Keramik', custom_fields_json = '{"Bahan":"Stoneware","Kapasitas":"320 ml"}', updated_at = datetime('now')
WHERE sku = 'WDG-001' AND name = 'Widget' AND description = 'A simple, reliable widget for everyday tasks.' AND price_cents = 4500000 AND image_key = 'products/widget.svg' AND category = 'Equipment' AND custom_fields_json = '{"Material":"Aluminium","Warranty":"1 year"}';
UPDATE catalog_items
SET name = 'Tas Linen', description = 'Tas linen ringan dengan ruang yang cukup untuk ritme harian.', price_cents = 480000000, image_key = 'products/tas-linen.webp', sku = 'TOKO-TAS-LINEN-002', category = 'Tas', custom_fields_json = '{"Bahan":"Linen","Warna":"Natural"}', updated_at = datetime('now')
WHERE sku = 'GDG-002' AND name = 'Gadget' AND description = 'A slightly fancier gadget with some extra sparkle.' AND price_cents = 7500000 AND image_key = 'products/gadget.svg' AND category = 'Equipment' AND custom_fields_json = '{"Color":"Midnight","Weight":"320 g"}';
UPDATE catalog_items
SET name = 'Lampu Meja Arc', description = 'Lampu meja matte dengan cahaya lembut untuk sudut baca atau kerja.', price_cents = 1280000000, image_key = 'products/lampu-meja-arc.webp', sku = 'TOKO-LAMPU-ARC-003', category = 'Pencahayaan', custom_fields_json = '{"Bahan":"Aluminium","Warna":"Sage"}', updated_at = datetime('now')
WHERE sku = 'GZM-003' AND name = 'Gizmo' AND description = 'The gizmo you did not know you needed.' AND price_cents = 12000000 AND image_key = 'products/gizmo.svg' AND category = 'Gifts' AND custom_fields_json = '{"Edition":"Standard"}';

INSERT OR IGNORE INTO catalog_items (name, description, price_cents, image_key, sku, category, custom_fields_json) VALUES
  ('Cangkir Stoneware', 'Cangkir stoneware berbintik dengan siluet nyaman untuk kopi atau teh.', 280000000, 'products/cangkir-stoneware.webp', 'TOKO-CANGKIR-001', 'Keramik', '{"Bahan":"Stoneware","Kapasitas":"320 ml"}'),
  ('Tas Linen', 'Tas linen ringan dengan ruang yang cukup untuk ritme harian.', 480000000, 'products/tas-linen.webp', 'TOKO-TAS-LINEN-002', 'Tas', '{"Bahan":"Linen","Warna":"Natural"}'),
  ('Lampu Meja Arc', 'Lampu meja matte dengan cahaya lembut untuk sudut baca atau kerja.', 1280000000, 'products/lampu-meja-arc.webp', 'TOKO-LAMPU-ARC-003', 'Pencahayaan', '{"Bahan":"Aluminium","Warna":"Sage"}'),
  ('Jurnal Linen', 'Jurnal berlapis linen untuk catatan kecil, rencana, dan jeda.', 240000000, 'products/jurnal-linen.webp', 'TOKO-JURNAL-LINEN-004', 'Alat tulis', '{"Bahan":"Linen","Halaman":"160 halaman"}'),
  ('Nampan Walnut', 'Nampan walnut dengan tepian lembut untuk menyusun ritual pagi.', 360000000, 'products/nampan-walnut.webp', 'TOKO-NAMPAN-WALNUT-005', 'Meja', '{"Bahan":"Walnut","Ukuran":"28 cm"}'),
  ('Karaf Kaca', 'Karaf kaca bening dengan bentuk sederhana untuk air dan bunga.', 420000000, 'products/karaf-kaca.webp', 'TOKO-KARAF-KACA-006', 'Dapur', '{"Bahan":"Kaca borosilikat","Kapasitas":"1 liter"}');

INSERT OR IGNORE INTO inventory_item_stock (item_id, on_hand)
  SELECT id, 24 FROM catalog_items WHERE sku = 'TOKO-CANGKIR-001';
INSERT OR IGNORE INTO inventory_item_stock (item_id, on_hand)
  SELECT id, 12 FROM catalog_items WHERE sku = 'TOKO-TAS-LINEN-002';
INSERT OR IGNORE INTO inventory_item_stock (item_id, on_hand)
  SELECT id, 8 FROM catalog_items WHERE sku = 'TOKO-LAMPU-ARC-003';
INSERT OR IGNORE INTO inventory_item_stock (item_id, on_hand)
  SELECT id, 18 FROM catalog_items WHERE sku = 'TOKO-JURNAL-LINEN-004';
INSERT OR IGNORE INTO inventory_item_stock (item_id, on_hand)
  SELECT id, 6 FROM catalog_items WHERE sku = 'TOKO-NAMPAN-WALNUT-005';
INSERT OR IGNORE INTO inventory_item_stock (item_id, on_hand)
  SELECT id, 15 FROM catalog_items WHERE sku = 'TOKO-KARAF-KACA-006';
