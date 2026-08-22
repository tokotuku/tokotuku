-- Scheduling for catalog_items.fulfillment_type = 'scheduled' items — the
-- module a client with no stock to sell (a cat sitter, a studio, a rental)
-- installs instead of inventory. Three tables, following the same
-- extension-table shape as inventory: FKs point outward to the modules this
-- one requires (catalog, orders), never the reverse, so catalog and orders
-- stay installable without this module ever mattering to them.
--
-- No CHECK on `mode` here, same reasoning as catalog_items.fulfillment_type
-- and orders.status: it is open vocabulary a later release can extend
-- (e.g. a third mode) without a table rebuild. The two values this release
-- understands are 'range' (a start/end date span, N occurrences per day —
-- a multi-day cat-sitting stay) and 'slot' (a fixed weekly time slot with
-- its own capacity — a salon or clinic appointment).

-- Per-item scheduling configuration. One row per catalog item that has been
-- turned on for booking; absence of a row here for a 'scheduled' item just
-- means nobody has configured it yet, not an error.
CREATE TABLE IF NOT EXISTS booking_item_schedule (
  item_id INTEGER PRIMARY KEY REFERENCES catalog_items(id),
  mode TEXT NOT NULL DEFAULT 'range',
  -- min_days/max_days/occurrences_per_day only apply to mode = 'range'; a
  -- 'slot' item ignores them rather than needing them nulled out.
  min_days INTEGER NOT NULL DEFAULT 1 CHECK (min_days > 0),
  max_days INTEGER CHECK (max_days IS NULL OR max_days >= min_days),
  lead_time_days INTEGER NOT NULL DEFAULT 0 CHECK (lead_time_days >= 0),
  occurrences_per_day INTEGER NOT NULL DEFAULT 1 CHECK (occurrences_per_day > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Fixed weekly time slots for mode = 'slot' items. `capacity` is recorded
-- but not enforced this release — see booking_order_bookings below for why.
CREATE TABLE IF NOT EXISTS booking_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES catalog_items(id),
  -- 0 = Sunday .. 6 = Saturday, matching JS Date#getDay().
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity > 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS booking_slots_item_id_index ON booking_slots(item_id);

-- The actual request. One row per order — createInquiryOrder makes exactly
-- one order per booking request, so this is a 1:1 extension of orders, the
-- same shape as payments_bank_transfer_proofs.order_id.
--
-- Overlap/capacity is deliberately NOT checked here: this release records
-- requests and lets the admin see clashes on /admin/bookings, rather than
-- rejecting them automatically. That is a scope decision, not a missing
-- feature — enforcing it correctly needs a serializable reservation check
-- this release does not attempt.
-- No service_address/note columns here: they would only duplicate
-- orders.shipping_address/orders.customer_note, which createInquiryOrder
-- already writes for every order regardless of module. Read them through
-- the orders join instead — see listBookings in src/bookings.ts.
CREATE TABLE IF NOT EXISTS booking_order_bookings (
  order_id INTEGER PRIMARY KEY REFERENCES orders(id),
  item_id INTEGER NOT NULL REFERENCES catalog_items(id),
  mode TEXT NOT NULL,
  -- The date of the visit (mode = 'slot') or the first day of the stay
  -- (mode = 'range'). Always set, for either mode.
  start_date TEXT NOT NULL,
  -- Set for mode = 'range' only; NULL for mode = 'slot'.
  end_date TEXT CHECK (end_date IS NULL OR end_date >= start_date),
  -- Set for mode = 'slot' only; NULL for mode = 'range'.
  slot_id INTEGER REFERENCES booking_slots(id),
  occurrences_per_day INTEGER NOT NULL DEFAULT 1 CHECK (occurrences_per_day > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS booking_order_bookings_item_id_index ON booking_order_bookings(item_id);
CREATE INDEX IF NOT EXISTS booking_order_bookings_start_date_index ON booking_order_bookings(start_date);
