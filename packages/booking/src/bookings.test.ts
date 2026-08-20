import { describe, expect, it } from "vitest";
import type { Booking } from "./bookings";
import { findOverlappingOrderIds } from "./bookings";

function booking(overrides: Partial<Booking>): Booking {
  return {
    orderId: 1,
    orderNumber: "TK-1",
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
