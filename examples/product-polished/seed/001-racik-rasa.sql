-- Racik Rasa starting catalog. Local-only and safe to run repeatedly.
-- Product media is uploaded from seed/media/products by `karsa db seed`.

-- The catalog module's demo seed runs first. Keep its demo rows/media available
-- to the module, but remove its catalog rows from this store's final dataset.
DELETE FROM inventory_item_stock
WHERE item_id IN (SELECT id FROM catalog_items WHERE sku LIKE 'TOKO-%');
DELETE FROM catalog_items WHERE sku LIKE 'TOKO-%';

INSERT INTO catalog_items
  (name, description, price_cents, fulfillment_type, image_key, sku, category, custom_fields_json)
VALUES
  ('Kopi Arabika Toraja 200 g', 'Kopi arabika Toraja dengan aroma rempah lembut, rasa cokelat, dan akhir yang bersih untuk seduhan pagi.', 7800000, 'physical', 'products/racik-rasa-kopi.png', 'RR-KOP-001', 'Kopi', '{"Berat":"200 g","Asal":"Toraja","Sangrai":"Medium"}'),
  ('Kopi Robusta Temanggung 200 g', 'Kopi robusta Temanggung yang pekat dan berani, cocok untuk tubruk serta teman obrolan sore.', 6200000, 'physical', 'products/racik-rasa-kopi.png', 'RR-KOP-002', 'Kopi', '{"Berat":"200 g","Asal":"Temanggung","Sangrai":"Medium-dark"}'),
  ('Rempah Kuning Nusantara 80 g', 'Racikan kunyit, ketumbar, jintan, dan serai untuk memberi warna serta kedalaman rasa pada masakan rumahan.', 3600000, 'physical', 'products/racik-rasa-rempah.png', 'RR-REM-003', 'Rempah', '{"Berat":"80 g","Asal":"Nusantara","Porsi":"4-6 masakan"}'),
  ('Teh Melati Wangi 40 g', 'Teh hitam beraroma melati yang ringan dan menenangkan, nikmat diseduh hangat kapan saja.', 4200000, 'physical', 'products/racik-rasa-teh.png', 'RR-TEH-004', 'Teh', '{"Berat":"40 g","Bentuk":"Daun teh","Seduhan":"8-10 cangkir"}'),
  ('Sambal Kecombrang 150 g', 'Sambal kecombrang dengan cabai pilihan dan aroma bunga yang segar untuk nasi hangat dan lauk harian.', 4500000, 'physical', 'products/racik-rasa-sambal.png', 'RR-SAM-005', 'Sambal', '{"Berat":"150 g","Tingkat pedas":"Sedang","Saran":"Simpan dingin setelah dibuka"}'),
  ('Sambal Terasi Bakar 150 g', 'Sambal terasi bakar yang gurih, pedas, dan wangi untuk melengkapi sayur, ikan, atau ayam goreng.', 3900000, 'physical', 'products/racik-rasa-sambal.png', 'RR-SAM-006', 'Sambal', '{"Berat":"150 g","Tingkat pedas":"Sedang-pedas","Saran":"Sajikan dengan nasi hangat"}')
ON CONFLICT(sku) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  price_cents = excluded.price_cents,
  fulfillment_type = excluded.fulfillment_type,
  image_key = excluded.image_key,
  category = excluded.category,
  custom_fields_json = excluded.custom_fields_json,
  updated_at = datetime('now');

INSERT INTO inventory_item_stock (item_id, on_hand)
  SELECT id, 28 FROM catalog_items WHERE sku = 'RR-KOP-001'
ON CONFLICT(item_id) DO UPDATE SET on_hand = excluded.on_hand, updated_at = datetime('now');
INSERT INTO inventory_item_stock (item_id, on_hand)
  SELECT id, 24 FROM catalog_items WHERE sku = 'RR-KOP-002'
ON CONFLICT(item_id) DO UPDATE SET on_hand = excluded.on_hand, updated_at = datetime('now');
INSERT INTO inventory_item_stock (item_id, on_hand)
  SELECT id, 32 FROM catalog_items WHERE sku = 'RR-REM-003'
ON CONFLICT(item_id) DO UPDATE SET on_hand = excluded.on_hand, updated_at = datetime('now');
INSERT INTO inventory_item_stock (item_id, on_hand)
  SELECT id, 26 FROM catalog_items WHERE sku = 'RR-TEH-004'
ON CONFLICT(item_id) DO UPDATE SET on_hand = excluded.on_hand, updated_at = datetime('now');
INSERT INTO inventory_item_stock (item_id, on_hand)
  SELECT id, 20 FROM catalog_items WHERE sku = 'RR-SAM-005'
ON CONFLICT(item_id) DO UPDATE SET on_hand = excluded.on_hand, updated_at = datetime('now');
INSERT INTO inventory_item_stock (item_id, on_hand)
  SELECT id, 22 FROM catalog_items WHERE sku = 'RR-SAM-006'
ON CONFLICT(item_id) DO UPDATE SET on_hand = excluded.on_hand, updated_at = datetime('now');
