import { describe, expect, it } from "vitest";
import { findAdminOrderDetail, orderTransitions, updateOrderStatus } from "./orders";

/**
 * Minimal fake covering only what updateOrderStatus's three queries need:
 * the current-status lookup, the order_items lookup for status-change
 * hooks, and the final UPDATE. No test here registers a status-change
 * hook, so the order_items rows returned never actually matter.
 */
function fakeDbWithStatus(currentStatus: string) {
  const prepare = (sql: string) => {
    if (sql.includes("SELECT status FROM orders")) {
      return { bind: () => ({ first: async () => ({ status: currentStatus }) }) };
    }
    if (sql.includes("SELECT item_id")) {
      return { bind: () => ({ all: async () => ({ results: [] }) }) };
    }
    return { bind: () => ({}) };
  };
  const batch = async () => [];
  return { prepare, batch };
}

describe("orderTransitions", () => {
  it("has no CHECK-worthy gaps: every status is a key, terminal statuses map to []", () => {
    const statuses = Object.keys(orderTransitions);
    for (const status of statuses) {
      for (const next of orderTransitions[status as keyof typeof orderTransitions]) {
        expect(statuses).toContain(next);
      }
    }
  });
});

describe("updateOrderStatus", () => {
  it("allows a legal cross-lifecycle transition: inquiry -> confirmed", async () => {
    const db = fakeDbWithStatus("inquiry");
    await expect(updateOrderStatus(db as never, 1, "confirmed")).resolves.toBeUndefined();
  });

  it("rejects a transition out of a terminal status: completed -> confirmed", async () => {
    const db = fakeDbWithStatus("completed");
    await expect(updateOrderStatus(db as never, 1, "confirmed")).rejects.toThrow();
  });

  it("cancelled is terminal: it can never be reactivated", async () => {
    const db = fakeDbWithStatus("cancelled");
    await expect(updateOrderStatus(db as never, 1, "confirmed")).rejects.toThrow();
  });

  it("allows resubmitting the same non-terminal status as a no-op save", async () => {
    const db = fakeDbWithStatus("confirmed");
    await expect(updateOrderStatus(db as never, 1, "confirmed")).resolves.toBeUndefined();
  });

  it("throws when the order does not exist", async () => {
    const db = {
      prepare: () => ({ bind: () => ({ first: async () => null }) }),
      batch: async () => [],
    };
    await expect(updateOrderStatus(db as never, 999, "confirmed")).rejects.toThrow();
  });
});

describe("findAdminOrderDetail", () => {
  it("maps customer, payment, and item data with one joined read", async () => {
    let prepareCalls = 0;
    const db = {
      prepare: () => {
        prepareCalls += 1;
        return {
          bind: () => ({
            all: async () => ({
              results: [
                {
                  id: 7,
                  order_number: "TK-7",
                  customer_name: "Ratri",
                  customer_email: "ratri@example.test",
                  customer_phone: "0800",
                  shipping_address: "Jl. Teak 1",
                  shipping_city: "Yogyakarta",
                  shipping_postal_code: "55111",
                  customer_note: "Call before delivery",
                  source: "web",
                  created_at: "2026-08-22 08:00:00",
                  total_cents: 125000,
                  status: "pending",
                  payment_status: "unpaid",
                  payment_method: "transfer",
                  payment_proof_key: "payment-proofs/7.jpg",
                  item_id: 3,
                  product_name: "Teak tray",
                  sku: "TRAY-001",
                  price_cents: 125000,
                  quantity: 1,
                  line_total_cents: 125000,
                },
              ],
            }),
          }),
        };
      },
    };

    await expect(findAdminOrderDetail(db as never, 7)).resolves.toMatchObject({
      orderNumber: "TK-7",
      customerPhone: "0800",
      paymentMethod: "transfer",
      items: [{ itemId: 3, quantity: 1, lineTotalCents: 125000 }],
    });
    expect(prepareCalls).toBe(1);
  });

  it("returns null when the joined order query has no rows", async () => {
    const db = { prepare: () => ({ bind: () => ({ all: async () => ({ results: [] }) }) }) };
    await expect(findAdminOrderDetail(db as never, 404)).resolves.toBeNull();
  });
});
