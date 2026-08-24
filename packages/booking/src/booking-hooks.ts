import { onOrderCreate } from "@karsa/core";
import { isCanonicalIsoDate } from "./submission-security";

/**
 * The shape /booking/[id].astro puts in attributes.booking when it calls
 * createInquiryOrder. itemId is carried explicitly here rather than read
 * back off ctx.items[0] — this release only ever books one item per order,
 * but nothing should silently assume "the item at index 0" stays true.
 */
export interface BookingRequestAttributes {
  itemId: number;
  mode: string;
  startDate: string;
  endDate: string | null;
  slotId: number | null;
  occurrencesPerDay: number;
  submissionFingerprint?: string;
}

/**
 * Writes the booking_order_bookings row in the same atomic batch as the
 * order's creation. This hook fires for every order created store-wide, not
 * just bookings — a physical checkout through @karsa/orders' createOrder
 * never sets attributes.booking, so it returns [] for those, the same way
 * catalog's inventory hook is a no-op for anything that isn't its concern.
 */
export function registerBookingHooks(): void {
  onOrderCreate(({ db, orderNumber, attributes }) => {
    const booking = attributes?.["booking"] as BookingRequestAttributes | undefined;
    if (!booking) return [];
    if (!isCanonicalIsoDate(booking.startDate)) throw new Error("Tanggal booking tidak valid.");
    if (booking.mode !== "range" && booking.mode !== "slot") {
      throw new Error("Mode booking tidak valid.");
    }
    if (booking.mode === "range") {
      if (
        !booking.endDate ||
        !isCanonicalIsoDate(booking.endDate) ||
        booking.endDate < booking.startDate
      ) {
        throw new Error("Rentang tanggal booking tidak valid.");
      }
    } else if (booking.mode === "slot" && booking.endDate !== null) {
      throw new Error("Data slot booking tidak valid.");
    }
    if (
      booking.submissionFingerprint !== undefined &&
      !/^[a-f0-9]{64}$/.test(booking.submissionFingerprint)
    ) {
      throw new Error("Fingerprint booking tidak valid.");
    }
    return [
      db
        .prepare(
          `INSERT INTO booking_order_bookings
            (order_id, item_id, mode, start_date, end_date, slot_id, occurrences_per_day, submission_fingerprint)
           VALUES ((SELECT id FROM orders WHERE order_number = ?), ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          orderNumber,
          booking.itemId,
          booking.mode,
          booking.startDate,
          booking.endDate,
          booking.slotId,
          booking.occurrencesPerDay,
          booking.submissionFingerprint ?? null,
        ),
    ];
  });
}
