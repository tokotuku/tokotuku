CREATE INDEX IF NOT EXISTS idx_booking_admin_cursor
  ON booking_order_bookings(start_date ASC, order_id ASC);

CREATE INDEX IF NOT EXISTS idx_booking_overlap_lookup
  ON booking_order_bookings(item_id, mode, slot_id, start_date, end_date);
