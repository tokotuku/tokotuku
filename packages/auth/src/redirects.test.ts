import { describe, expect, it } from "vitest";
import { safeInternalPath } from "./redirects";

describe("safeInternalPath", () => {
  const origin = "https://shop.example";

  it("keeps a normal internal path and its query", () => {
    expect(safeInternalPath("/checkout?step=2", origin)).toBe("/checkout?step=2");
  });

  it.each([
    "//evil.example/path",
    "/\\evil.example/path",
    "/%5c%5cevil.example/path",
    "https://evil.example",
    "\u0000/admin",
  ])("falls back for unsafe destination %j", (value) =>
    expect(safeInternalPath(value, origin)).toBe("/admin"));
});
