import type { D1Database } from "@cloudflare/workers-types";

export interface ItemSchedule {
  itemId: number;
  /** Open vocabulary, same reasoning as catalog's fulfillment_type: 'range' or 'slot' today. */
  mode: string;
  minDays: number;
  maxDays: number | null;
  leadTimeDays: number;
  occurrencesPerDay: number;
}

interface ItemScheduleRow {
  item_id: number;
  mode: string;
  min_days: number;
  max_days: number | null;
  lead_time_days: number;
  occurrences_per_day: number;
}

function toItemSchedule(row: ItemScheduleRow): ItemSchedule {
  return {
    itemId: row.item_id,
    mode: row.mode,
    minDays: row.min_days,
    maxDays: row.max_days,
    leadTimeDays: row.lead_time_days,
    occurrencesPerDay: row.occurrences_per_day,
  };
}

/** Null means "not configured yet" — a distinct state from "this item isn't scheduled at all", which the caller already knows from catalog's fulfillment_type before ever calling this. */
export async function findItemSchedule(
  db: D1Database,
  itemId: number,
): Promise<ItemSchedule | null> {
  const row = await db
    .prepare(
      "SELECT item_id, mode, min_days, max_days, lead_time_days, occurrences_per_day FROM booking_item_schedule WHERE item_id = ?",
    )
    .bind(itemId)
    .first<ItemScheduleRow>();
  return row ? toItemSchedule(row) : null;
}

export interface BookingSlot {
  id: number;
  itemId: number;
  /** 0 = Sunday .. 6 = Saturday, matching JS Date#getDay(). */
  weekday: number;
  startTime: string;
  durationMinutes: number;
  capacity: number;
  isActive: boolean;
}

interface BookingSlotRow {
  id: number;
  item_id: number;
  weekday: number;
  start_time: string;
  duration_minutes: number;
  capacity: number;
  is_active: number;
}

export async function listSlots(
  db: D1Database,
  itemId: number,
  { activeOnly = true }: { activeOnly?: boolean } = {},
): Promise<BookingSlot[]> {
  const { results } = await db
    .prepare(
      `SELECT id, item_id, weekday, start_time, duration_minutes, capacity, is_active
       FROM booking_slots WHERE item_id = ?${activeOnly ? " AND is_active = 1" : ""}
       ORDER BY weekday ASC, start_time ASC`,
    )
    .bind(itemId)
    .all<BookingSlotRow>();
  return results.map((row) => ({
    id: row.id,
    itemId: row.item_id,
    weekday: row.weekday,
    startTime: row.start_time,
    durationMinutes: row.duration_minutes,
    capacity: row.capacity,
    isActive: row.is_active === 1,
  }));
}

export interface Booking {
  orderId: number;
  orderNumber: string;
  itemId: number;
  itemName: string;
  mode: string;
  startDate: string;
  endDate: string | null;
  slotId: number | null;
  /** Only set for mode 'slot' — the booked slot's own schedule, joined in for display. */
  slotWeekday: number | null;
  slotStartTime: string | null;
  occurrencesPerDay: number;
  serviceAddress: string;
  note: string;
  status: string;
  customerName: string;
  customerPhone: string;
}

interface BookingRow {
  order_id: number;
  order_number: string;
  item_id: number;
  item_name: string;
  mode: string;
  start_date: string;
  end_date: string | null;
  slot_id: number | null;
  slot_weekday: number | null;
  slot_start_time: string | null;
  occurrences_per_day: number;
  service_address: string;
  note: string;
  status: string;
  customer_name: string;
  customer_phone: string;
}

function toBooking(row: BookingRow): Booking {
  return {
    orderId: row.order_id,
    orderNumber: row.order_number,
    itemId: row.item_id,
    itemName: row.item_name,
    mode: row.mode,
    startDate: row.start_date,
    endDate: row.end_date,
    slotId: row.slot_id,
    slotWeekday: row.slot_weekday,
    slotStartTime: row.slot_start_time,
    occurrencesPerDay: row.occurrences_per_day,
    serviceAddress: row.service_address,
    note: row.note,
    status: row.status,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
  };
}

export interface ListBookingsOptions {
  /** Inclusive. A booking is included if its span intersects [from, to] at all. */
  from?: string;
  to?: string;
  status?: string;
}

export async function listBookings(
  db: D1Database,
  { from, to, status }: ListBookingsOptions = {},
): Promise<Booking[]> {
  const conditions: string[] = [];
  const bindings: unknown[] = [];
  if (from) {
    conditions.push("COALESCE(b.end_date, b.start_date) >= ?");
    bindings.push(from);
  }
  if (to) {
    conditions.push("b.start_date <= ?");
    bindings.push(to);
  }
  if (status) {
    conditions.push("o.status = ?");
    bindings.push(status);
  }
  const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
  const { results } = await db
    .prepare(
      `SELECT b.order_id, o.order_number, b.item_id, ci.name AS item_name, b.mode,
              b.start_date, b.end_date, b.slot_id, s.weekday AS slot_weekday,
              s.start_time AS slot_start_time, b.occurrences_per_day,
              o.shipping_address AS service_address, o.customer_note AS note,
              o.status, o.customer_name, o.customer_phone
       FROM booking_order_bookings b
       JOIN orders o ON o.id = b.order_id
       JOIN catalog_items ci ON ci.id = b.item_id
       LEFT JOIN booking_slots s ON s.id = b.slot_id${where}
       ORDER BY b.start_date ASC, b.order_id ASC`,
    )
    .bind(...bindings)
    .all<BookingRow>();
  return results.map(toBooking);
}

/** Load one booking for the admin quick view without reading unrelated orders. */
export async function findBookingByOrderId(
  db: D1Database,
  orderId: number,
): Promise<Booking | null> {
  const row = await db
    .prepare(
      `SELECT b.order_id, o.order_number, b.item_id, ci.name AS item_name, b.mode,
              b.start_date, b.end_date, b.slot_id, s.weekday AS slot_weekday,
              s.start_time AS slot_start_time, b.occurrences_per_day,
              o.shipping_address AS service_address, o.customer_note AS note,
              o.status, o.customer_name, o.customer_phone
       FROM booking_order_bookings b
       JOIN orders o ON o.id = b.order_id
       JOIN catalog_items ci ON ci.id = b.item_id
       LEFT JOIN booking_slots s ON s.id = b.slot_id
       WHERE b.order_id = ?`,
    )
    .bind(orderId)
    .first<BookingRow>();
  return row ? toBooking(row) : null;
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/** Same item, and either the same slot on the same date, or overlapping date ranges. */
function bookingsClash(a: Booking, b: Booking): boolean {
  if (a.itemId !== b.itemId) return false;
  if (a.mode === "slot" && b.mode === "slot") {
    return a.slotId === b.slotId && a.startDate === b.startDate;
  }
  return rangesOverlap(
    a.startDate,
    a.endDate ?? a.startDate,
    b.startDate,
    b.endDate ?? b.startDate,
  );
}

/**
 * Which bookings clash with another booking for the *same item*. Purely
 * informational: nothing rejects a booking for clashing, see the note on
 * booking_order_bookings in migrations/0001_init.sql. This runs in
 * TypeScript over an already-fetched page of bookings rather than in SQL —
 * the realistic data volume for one store's schedule is small enough that
 * an O(n²) scan needs no cleverness.
 */
export function findOverlappingOrderIds(bookings: Booking[]): Set<number> {
  const overlapping = new Set<number>();
  for (let i = 0; i < bookings.length; i++) {
    for (let j = i + 1; j < bookings.length; j++) {
      const a = bookings[i];
      const b = bookings[j];
      if (a && b && bookingsClash(a, b)) {
        overlapping.add(a.orderId);
        overlapping.add(b.orderId);
      }
    }
  }
  return overlapping;
}
