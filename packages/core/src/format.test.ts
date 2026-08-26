import { describe, expect, it } from "vitest";
import { createFormatters } from "./format";

describe("createFormatters", () => {
  it("formats money by delegating to Intl.NumberFormat with the given locale and currency", () => {
    const { money } = createFormatters({ locale: "id-ID", currency: "IDR" });
    const expected = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(50000);
    expect(money(50000)).toBe(expected);
  });

  it("formats dates by delegating to Intl.DateTimeFormat with the given locale and time zone", () => {
    const { date } = createFormatters({
      locale: "id-ID",
      currency: "IDR",
      timeZone: "Asia/Jakarta",
    });
    const input = "2026-08-13T10:00:00Z";
    const expected = new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(new Date(input));
    expect(date(input)).toBe(expected);
  });

  it("accepts a Date instance in addition to a string", () => {
    const { date } = createFormatters({
      locale: "id-ID",
      currency: "IDR",
      timeZone: "Asia/Jakarta",
    });
    const input = new Date("2026-08-13T10:00:00Z");
    expect(date(input)).toBe(date(input.toISOString()));
  });

  it("keeps dates universal while making money failures explicit without currency", () => {
    const { money, date } = createFormatters({ locale: "en-US", timeZone: "UTC" });
    expect(() => money(10)).toThrow(
      "Karsa money() requires brand.currency. Add brand.currency before formatting monetary values.",
    );
    expect(date("2026-08-13T10:00:00Z")).toContain("2026");
  });
});
