-- Racik Rasa starting catalog. This file is local-only and safe to run repeatedly.
-- The catalog module seeds its six demo rows first; remove those rows and their
-- stock before loading this store's six products.

DELETE FROM inventory_item_stock
WHERE item_id IN (SELECT id FROM catalog_items WHERE sku LIKE 'TOKO-%');

DELETE FROM catalog_items
WHERE sku LIKE 'TOKO-%';

INSERT OR IGNORE INTO catalog_items
  (name, description, price_cents, fulfillment_type, image_key, sku, category, custom_fields_json)
VALUES
  ('Bumbu Rendang Minang 100 g', 'Paduan cabai, ketumbar, jintan, dan rempah hangat untuk rendang kaya rasa.', 4500000, 'physical', 'products/cangkir-stoneware.webp', 'RR-BUM-001', 'Bumbu Masak', '{"Berat":"100 g","Asal":"Sumatera Barat"}'),
  ('Sambal Ijo Padang 150 g', 'Sambal hijau gurih dengan cabai pilihan, cocok untuk nasi hangat dan lauk harian.', 3800000, 'physical', 'products/tas-linen.webp', 'RR-SAM-002', 'Sambal', '{"Berat":"150 g","Tingkat pedas":"Sedang"}'),
  ('Bumbu Soto Nusantara 80 g', 'Racikan kunyit, serai, bawang, dan rempah untuk kuah soto yang harum dan ringan.', 3200000, 'physical', 'products/lampu-meja-arc.webp', 'RR-SOT-003', 'Bumbu Masak', '{"Berat":"80 g","Porsi":"4-5 mangkuk"}'),
  ('Serundeng Kelapa Gurih 120 g', 'Kelapa sangrai berbumbu dengan tekstur renyah untuk taburan nasi, lontong, atau bubur.', 3600000, 'physical', 'products/jurnal-linen.webp', 'RR-SER-004', 'Pelengkap', '{"Berat":"120 g","Tekstur":"Renyah"}'),
  ('Lada Hitam Tumbuk 60 g', 'Lada hitam yang ditumbuk segar untuk memberi aroma tajam dan rasa hangat pada masakan.', 2900000, 'physical', 'products/nampan-walnut.webp', 'RR-LAD-005', 'Rempah', '{"Berat":"60 g","Bentuk":"Tumbuk"}'),
  ('Kayu Manis Batang 50 g', 'Kayu manis aromatik untuk minuman hangat, semur, kolak, dan racikan manis rumahan.', 2700000, 'physical', 'products/karaf-kaca.webp', 'RR-KAY-006', 'Rempah', '{"Berat":"50 g","Bentuk":"Batang"}')
ON CONFLICT(sku) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  price_cents = excluded.price_cents,
  fulfillment_type = excluded.fulfillment_type,
  image_key = excluded.image_key,
  category = excluded.category,
  is_active = 1,
  custom_fields_json = excluded.custom_fields_json,
  updated_at = datetime('now');

INSERT INTO inventory_item_stock (item_id, on_hand)
  SELECT id, 24 FROM catalog_items WHERE sku = 'RR-BUM-001'
ON CONFLICT(item_id) DO UPDATE SET on_hand = excluded.on_hand, updated_at = datetime('now');
INSERT INTO inventory_item_stock (item_id, on_hand)
  SELECT id, 18 FROM catalog_items WHERE sku = 'RR-SAM-002'
ON CONFLICT(item_id) DO UPDATE SET on_hand = excluded.on_hand, updated_at = datetime('now');
INSERT INTO inventory_item_stock (item_id, on_hand)
  SELECT id, 30 FROM catalog_items WHERE sku = 'RR-SOT-003'
ON CONFLICT(item_id) DO UPDATE SET on_hand = excluded.on_hand, updated_at = datetime('now');
INSERT INTO inventory_item_stock (item_id, on_hand)
  SELECT id, 16 FROM catalog_items WHERE sku = 'RR-SER-004'
ON CONFLICT(item_id) DO UPDATE SET on_hand = excluded.on_hand, updated_at = datetime('now');
INSERT INTO inventory_item_stock (item_id, on_hand)
  SELECT id, 22 FROM catalog_items WHERE sku = 'RR-LAD-005'
ON CONFLICT(item_id) DO UPDATE SET on_hand = excluded.on_hand, updated_at = datetime('now');
INSERT INTO inventory_item_stock (item_id, on_hand)
  SELECT id, 20 FROM catalog_items WHERE sku = 'RR-KAY-006'
ON CONFLICT(item_id) DO UPDATE SET on_hand = excluded.on_hand, updated_at = datetime('now');
