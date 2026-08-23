import { describe, expect, it } from "vitest";
import {
  assertCursor,
  CursorError,
  cursorFilterSignature,
  decodeCursor,
  encodeCursor,
  normalizePageSize,
} from "./cursor";

describe("cursor transport", () => {
  const filters = cursorFilterSignature({ search: "coffee", category: "beans" });

  it("round-trips versioned base64url metadata", () => {
    const cursor = encodeCursor({ domain: "catalog", keys: { id: 42 }, filters });
    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(assertCursor(cursor, { domain: "catalog", filters })).toMatchObject({
      v: 1,
      domain: "catalog",
      keys: { id: 42 },
    });
  });

  it("rejects malformed, cross-domain, and cross-filter cursors", () => {
    expect(() => decodeCursor("not valid!")).toThrow(CursorError);
    const incomplete = btoa(JSON.stringify({ v: 1, domain: "", keys: {}, filters: "" }))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/, "");
    expect(() => decodeCursor(incomplete)).toThrow(CursorError);
    const cursor = encodeCursor({ domain: "orders", keys: { id: 7 }, filters });
    expect(() => assertCursor(cursor, { domain: "catalog", filters })).toThrow(CursorError);
    expect(() => assertCursor(cursor, { domain: "orders", filters: "{}" })).toThrow(CursorError);
  });

  it("enforces the public 1..100 page-size contract", () => {
    expect(normalizePageSize()).toBe(25);
    expect(normalizePageSize(100)).toBe(100);
    expect(() => normalizePageSize(0)).toThrow(RangeError);
    expect(() => normalizePageSize(101)).toThrow(RangeError);
  });

  it("keeps filter values out of the cursor signature", () => {
    const signature = cursorFilterSignature({ search: "customer@example.com", status: "pending" });
    expect(signature).toMatch(/^fnv1a-[0-9a-f]{8}$/);
    expect(signature).not.toContain("customer");
    expect(signature).toBe(
      cursorFilterSignature({ status: "pending", search: "customer@example.com" }),
    );
  });
});
