import { describe, expect, it } from "vitest";
import type { Booking } from "./bookings";
import {
  type BookingScheduleInput,
  findBookingByOrderId,
  findOverlappingOrderIds,
  saveItemSchedule,
} from "./bookings";

function booking(overrides: Partial<Booking>): Booking {
  return {
    orderId: 1,
    orderNumber: "KR-1",
    itemId: 1,
    itemName: "Basic Visit",
    mode: "range",
    startDate: "2026-09-03",
    endDate: "2026-09-05",
    slotId: null,
    slotWeekday: null,
    slotStartTime: null,
    occurrencesPerDay: 1,
    serviceAddress: "Jl. Contoh 1",
    note: "",
    status: "inquiry",
    customerName: "Test",
    customerPhone: "0800",
    hasOverlap: false,
    ...overrides,
  };
}

describe("findOverlappingOrderIds", () => {
  it("flags two range bookings for the same item with overlapping dates", () => {
    const a = booking({ orderId: 1, startDate: "2026-09-03", endDate: "2026-09-05" });
    const b = booking({ orderId: 2, startDate: "2026-09-04", endDate: "2026-09-06" });
    expect(findOverlappingOrderIds([a, b])).toEqual(new Set([1, 2]));
  });

  it("does not flag adjacent, non-overlapping range bookings", () => {
    const a = booking({ orderId: 1, startDate: "2026-09-03", endDate: "2026-09-05" });
    const b = booking({ orderId: 2, startDate: "2026-09-06", endDate: "2026-09-08" });
    expect(findOverlappingOrderIds([a, b])).toEqual(new Set());
  });

  it("does not flag overlapping dates for different items", () => {
    const a = booking({ orderId: 1, itemId: 1, startDate: "2026-09-03", endDate: "2026-09-05" });
    const b = booking({ orderId: 2, itemId: 2, startDate: "2026-09-03", endDate: "2026-09-05" });
    expect(findOverlappingOrderIds([a, b])).toEqual(new Set());
  });

  it("flags two slot bookings for the same item, slot, and date", () => {
    const a = booking({
      orderId: 1,
      mode: "slot",
      slotId: 7,
      startDate: "2026-09-03",
      endDate: null,
    });
    const b = booking({
      orderId: 2,
      mode: "slot",
      slotId: 7,
      startDate: "2026-09-03",
      endDate: null,
    });
    expect(findOverlappingOrderIds([a, b])).toEqual(new Set([1, 2]));
  });

  it("does not flag two slot bookings for different slots on the same date", () => {
    const a = booking({
      orderId: 1,
      mode: "slot",
      slotId: 7,
      startDate: "2026-09-03",
      endDate: null,
    });
    const b = booking({
      orderId: 2,
      mode: "slot",
      slotId: 8,
      startDate: "2026-09-03",
      endDate: null,
    });
    expect(findOverlappingOrderIds([a, b])).toEqual(new Set());
  });

  it("treats a single-day range (start === end) correctly", () => {
    const a = booking({ orderId: 1, startDate: "2026-09-03", endDate: "2026-09-03" });
    const b = booking({ orderId: 2, startDate: "2026-09-03", endDate: "2026-09-03" });
    expect(findOverlappingOrderIds([a, b])).toEqual(new Set([1, 2]));
  });
});

describe("findBookingByOrderId", () => {
  it("returns the booking row joined to its order", async () => {
    const db = {
      prepare: () => ({
        bind: () => ({
          first: async () => ({
            order_id: 9,
            order_number: "KR-9",
            item_id: 4,
            item_name: "Studio visit",
            mode: "slot",
            start_date: "2026-09-10",
            end_date: null,
            slot_id: 2,
            slot_weekday: 4,
            slot_start_time: "10:00",
            occurrences_per_day: 1,
            service_address: "Jl. Contoh 9",
            note: "Ring the bell",
            status: "confirmed",
            customer_name: "Bima",
            customer_phone: "0812",
          }),
        }),
      }),
    };
    await expect(findBookingByOrderId(db as never, 9)).resolves.toMatchObject({
      orderId: 9,
      orderNumber: "KR-9",
      itemName: "Studio visit",
      slotStartTime: "10:00",
    });
  });

  it("returns null when the order has no booking extension", async () => {
    const db = { prepare: () => ({ bind: () => ({ first: async () => null }) }) };
    await expect(findBookingByOrderId(db as never, 404)).resolves.toBeNull();
  });
});

function scheduleInput(overrides: Partial<BookingScheduleInput> = {}): BookingScheduleInput {
  return {
    mode: "slot",
    minDays: 1,
    maxDays: null,
    leadTimeDays: 2,
    occurrencesPerDay: 1,
    slots: [
      {
        weekday: 2,
        startTime: "10:00",
        durationMinutes: 60,
        capacity: 2,
        isActive: true,
      },
    ],
    ...overrides,
  };
}

function scheduleDb(fulfillmentType: string) {
  const prepared: string[] = [];
  let batchSize = 0;
  const db = {
    prepare(sql: string) {
      prepared.push(sql);
      return {
        bind: () => ({
          first: async () =>
            sql.startsWith("SELECT fulfillment_type")
              ? { fulfillment_type: fulfillmentType }
              : null,
          all: async () => ({ results: [] }),
        }),
      };
    },
    batch: async (statements: unknown[]) => {
      batchSize = statements.length;
      return { success: true };
    },
  };
  return { db, prepared: () => prepared, batchSize: () => batchSize };
}

describe("saveItemSchedule", () => {
  it("validates before touching the database", async () => {
    const fixture = scheduleDb("scheduled");
    await expect(
      saveItemSchedule(fixture.db as never, 4, scheduleInput({ minDays: 0 })),
    ).rejects.toThrow("Minimum hari minimal 1.");
    expect(fixture.prepared()).toEqual([]);
  });

  it("rejects malformed active state values", async () => {
    const fixture = scheduleDb("scheduled");
    const baseSlot = scheduleInput().slots[0];
    if (!baseSlot) throw new Error("Test fixture must include a slot.");
    await expect(
      saveItemSchedule(
        fixture.db as never,
        4,
        scheduleInput({
          slots: [{ ...baseSlot, isActive: "yes" as unknown as boolean }],
        }),
      ),
    ).rejects.toThrow("Status slot tidak valid.");
    expect(fixture.prepared()).toEqual([]);
  });

  it("refuses schedules for non-scheduled catalog items", async () => {
    const fixture = scheduleDb("physical");
    await expect(saveItemSchedule(fixture.db as never, 4, scheduleInput())).rejects.toThrow(
      "Jadwal hanya dapat dibuat untuk layanan terjadwal.",
    );
    expect(fixture.batchSize()).toBe(0);
  });

  it("persists the schedule and slots in one D1 batch", async () => {
    const fixture = scheduleDb("scheduled");
    await saveItemSchedule(fixture.db as never, 4, scheduleInput());
    expect(fixture.batchSize()).toBe(2);
    expect(fixture.prepared().filter((sql) => sql.includes("booking_item_schedule"))).toHaveLength(
      1,
    );
    expect(
      fixture.prepared().filter((sql) => sql.includes("INSERT INTO booking_slots")),
    ).toHaveLength(1);
  });
});
