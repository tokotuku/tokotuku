import { beforeEach, describe, expect, it } from "vitest";
import {
  ConstraintViolationError,
  collectOrderCreateStatements,
  collectOrderStatusChangeStatements,
  mapD1Error,
  onOrderCreate,
  onOrderStatusChange,
  resetOrderHooks,
} from "./db";

describe("order hooks", () => {
  beforeEach(() => {
    resetOrderHooks();
  });

  it("collects statements from every registered onOrderCreate hook", () => {
    const stmtA = { sql: "a" } as never;
    const stmtB = { sql: "b" } as never;
    onOrderCreate(() => [stmtA]);
    onOrderCreate(() => [stmtB]);

    const result = collectOrderCreateStatements({
      db: {} as never,
      orderNumber: "TK-1",
      items: [{ itemId: 1, quantity: 2 }],
    });

    expect(result).toContain(stmtA);
    expect(result).toContain(stmtB);
  });

  it("passes attributes through to the hook untouched", () => {
    let seen: Record<string, unknown> | undefined;
    onOrderCreate((ctx) => {
      seen = ctx.attributes;
      return [];
    });

    collectOrderCreateStatements({
      db: {} as never,
      orderNumber: "TK-1",
      items: [{ itemId: 1, quantity: 2 }],
      attributes: { booking: { startDate: "2026-09-03", endDate: "2026-09-07" } },
    });

    expect(seen).toEqual({ booking: { startDate: "2026-09-03", endDate: "2026-09-07" } });
  });

  it("a hook that doesn't recognize the attributes key returns no statements", () => {
    onOrderCreate((ctx) => {
      const booking = ctx.attributes?.["booking"];
      return booking ? [{ sql: "insert booking" } as never] : [];
    });

    const result = collectOrderCreateStatements({
      db: {} as never,
      orderNumber: "TK-1",
      items: [{ itemId: 1, quantity: 1 }],
    });

    expect(result).toEqual([]);
  });

  it("returns no statements when no hook is registered for status changes", () => {
    const result = collectOrderStatusChangeStatements({
      db: {} as never,
      orderId: 1,
      previousStatus: "pending",
      nextStatus: "cancelled",
      items: [],
    });
    expect(result).toEqual([]);
  });

  it("registering the same hook reference twice does not duplicate its statements", () => {
    const stmt = { sql: "once" } as never;
    const hook = () => [stmt];
    onOrderStatusChange(hook);
    onOrderStatusChange(hook);

    const result = collectOrderStatusChangeStatements({
      db: {} as never,
      orderId: 1,
      previousStatus: "pending",
      nextStatus: "cancelled",
      items: [],
    });

    expect(result.filter((s) => s === stmt)).toHaveLength(1);
  });
});

describe("mapD1Error", () => {
  it("maps a CHECK constraint failure to a ConstraintViolationError naming the constraint", () => {
    const raw = new Error("D1_ERROR: CHECK constraint failed: on_hand >= 0: SQLITE_CONSTRAINT");
    const mapped = mapD1Error(raw);
    expect(mapped).toBeInstanceOf(ConstraintViolationError);
    expect((mapped as ConstraintViolationError).constraint).toBe("on_hand >= 0");
  });

  it("passes through errors that are not CHECK constraint failures", () => {
    const raw = new Error("UNIQUE constraint failed: products.sku");
    expect(mapD1Error(raw)).toBe(raw);
  });

  it("wraps non-Error throws", () => {
    const mapped = mapD1Error("boom");
    expect(mapped).toBeInstanceOf(Error);
    expect(mapped.message).toBe("boom");
  });
});
