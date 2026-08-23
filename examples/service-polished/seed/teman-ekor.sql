-- Teman Ekor starting services. Local-only and safe to run repeatedly.
-- The catalog module seed runs first and creates physical TOKO-* demo rows.

-- Remove the module demo's dependent inventory and catalog rows. These guards
-- are scoped to the package seed's TOKO-* identities and never touch users.
DELETE FROM inventory_movements
WHERE item_id IN (SELECT id FROM catalog_items WHERE sku LIKE 'TOKO-%');

DELETE FROM inventory_item_stock
WHERE item_id IN (SELECT id FROM catalog_items WHERE sku LIKE 'TOKO-%');

DELETE FROM catalog_items
WHERE sku LIKE 'TOKO-%';

-- Upsert each service separately so the three service rows remain explicit.
INSERT INTO catalog_items
  (name, description, price_cents, fulfillment_type, image_key, sku, category, custom_fields_json)
VALUES
  ('Penitipan Hewan', 'Penitipan harian yang tenang dan terawat dengan pemeriksaan rutin, waktu bermain, serta kabar untuk Anda selama bepergian.', 12500000, 'scheduled', 'products/teman-ekor-penitipan.png', 'TE-PEN-001', 'Penitipan Hewan', '{}')
ON CONFLICT(sku) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  price_cents = excluded.price_cents,
  fulfillment_type = excluded.fulfillment_type,
  image_key = excluded.image_key,
  category = excluded.category,
  custom_fields_json = excluded.custom_fields_json,
  is_active = 1,
  updated_at = datetime('now');

INSERT INTO catalog_items
  (name, description, price_cents, fulfillment_type, image_key, sku, category, custom_fields_json)
VALUES
  ('Grooming & Spa', 'Mandi, pengeringan, dan perawatan bulu dengan sentuhan lembut agar hewan kesayangan tetap bersih, segar, dan nyaman.', 15000000, 'scheduled', 'products/teman-ekor-grooming.png', 'TE-GRO-002', 'Grooming & Spa', '{}')
ON CONFLICT(sku) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  price_cents = excluded.price_cents,
  fulfillment_type = excluded.fulfillment_type,
  image_key = excluded.image_key,
  category = excluded.category,
  custom_fields_json = excluded.custom_fields_json,
  is_active = 1,
  updated_at = datetime('now');

INSERT INTO catalog_items
  (name, description, price_cents, fulfillment_type, image_key, sku, category, custom_fields_json)
VALUES
  ('Jalan-Jalan', 'Jalan-jalan terarah bersama pendamping berpengalaman agar anjing tetap aktif, ceria, dan mendapatkan stimulasi yang cukup.', 7500000, 'scheduled', 'products/teman-ekor-jalan-jalan.png', 'TE-JAL-003', 'Jalan-Jalan', '{}')
ON CONFLICT(sku) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  price_cents = excluded.price_cents,
  fulfillment_type = excluded.fulfillment_type,
  image_key = excluded.image_key,
  sku = excluded.sku,
  category = excluded.category,
  custom_fields_json = excluded.custom_fields_json,
  is_active = 1,
  updated_at = datetime('now');

-- Reconcile schedule rows for the three services, keeping one row per item.
INSERT INTO booking_item_schedule
  (item_id, mode, min_days, max_days, lead_time_days, occurrences_per_day)
SELECT id, 'range', 1, 14, 1, 1
FROM catalog_items
WHERE sku = 'TE-PEN-001'
ON CONFLICT(item_id) DO UPDATE SET
  mode = excluded.mode,
  min_days = excluded.min_days,
  max_days = excluded.max_days,
  lead_time_days = excluded.lead_time_days,
  occurrences_per_day = excluded.occurrences_per_day,
  updated_at = datetime('now');

INSERT INTO booking_item_schedule
  (item_id, mode, min_days, max_days, lead_time_days, occurrences_per_day)
SELECT id, 'slot', 1, NULL, 1, 1
FROM catalog_items
WHERE sku = 'TE-GRO-002'
ON CONFLICT(item_id) DO UPDATE SET
  mode = excluded.mode,
  min_days = excluded.min_days,
  max_days = excluded.max_days,
  lead_time_days = excluded.lead_time_days,
  occurrences_per_day = excluded.occurrences_per_day,
  updated_at = datetime('now');

INSERT INTO booking_item_schedule
  (item_id, mode, min_days, max_days, lead_time_days, occurrences_per_day)
SELECT id, 'slot', 1, NULL, 1, 1
FROM catalog_items
WHERE sku = 'TE-JAL-003'
ON CONFLICT(item_id) DO UPDATE SET
  mode = excluded.mode,
  min_days = excluded.min_days,
  max_days = excluded.max_days,
  lead_time_days = excluded.lead_time_days,
  occurrences_per_day = excluded.occurrences_per_day,
  updated_at = datetime('now');

-- Guard each slot so repeated local seeds do not create duplicate slots.
INSERT INTO booking_slots (item_id, weekday, start_time, duration_minutes, capacity, is_active)
SELECT id, 2, '09:00', 90, 2, 1
FROM catalog_items
WHERE sku = 'TE-GRO-002'
  AND NOT EXISTS (
    SELECT 1 FROM booking_slots
    WHERE item_id = catalog_items.id AND weekday = 2 AND start_time = '09:00'
  );

INSERT INTO booking_slots (item_id, weekday, start_time, duration_minutes, capacity, is_active)
SELECT id, 6, '13:00', 90, 2, 1
FROM catalog_items
WHERE sku = 'TE-GRO-002'
  AND NOT EXISTS (
    SELECT 1 FROM booking_slots
    WHERE item_id = catalog_items.id AND weekday = 6 AND start_time = '13:00'
  );

INSERT INTO booking_slots (item_id, weekday, start_time, duration_minutes, capacity, is_active)
SELECT id, 1, '07:00', 60, 3, 1
FROM catalog_items
WHERE sku = 'TE-JAL-003'
  AND NOT EXISTS (
    SELECT 1 FROM booking_slots
    WHERE item_id = catalog_items.id AND weekday = 1 AND start_time = '07:00'
  );

INSERT INTO booking_slots (item_id, weekday, start_time, duration_minutes, capacity, is_active)
SELECT id, 4, '17:00', 60, 3, 1
FROM catalog_items
WHERE sku = 'TE-JAL-003'
  AND NOT EXISTS (
    SELECT 1 FROM booking_slots
    WHERE item_id = catalog_items.id AND weekday = 4 AND start_time = '17:00'
  );
