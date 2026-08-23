import { describe, expect, it } from "vitest";
import { calculateDashboardReadiness } from "./dashboard-readiness";

describe("calculateDashboardReadiness", () => {
  it("keeps the default Takontuku workspace at admin-only progress", () => {
    expect(
      calculateDashboardReadiness({
        hasAuthenticatedAdmin: true,
        brandName: "Takontuku",
        hasLogo: false,
        moduleNames: [],
      }),
    ).toMatchObject({ completed: 1, total: 5, percentage: 20 });
  });

  it("reports 40 percent for Arunika with Auth and Jarene only", () => {
    const readiness = calculateDashboardReadiness({
      hasAuthenticatedAdmin: true,
      brandName: "Arunika Energi",
      hasLogo: false,
      moduleNames: ["auth", "jarene"],
    });

    expect(readiness.percentage).toBe(40);
    expect(readiness.steps).toEqual([
      { id: "admin", complete: true },
      { id: "brand", complete: true },
      { id: "logo", complete: false },
      { id: "catalog", complete: false },
      { id: "orders", complete: false },
    ]);
  });

  it("normalizes module names and reaches 80 percent with a logo and Catalog", () => {
    expect(
      calculateDashboardReadiness({
        hasAuthenticatedAdmin: true,
        brandName: "Arunika Energi",
        hasLogo: true,
        moduleNames: ["AUTH", "JARENE", "Catalog"],
      }).percentage,
    ).toBe(80);
  });

  it("ignores custom modules for launch readiness", () => {
    expect(
      calculateDashboardReadiness({
        hasAuthenticatedAdmin: true,
        brandName: "Arunika Energi",
        hasLogo: false,
        moduleNames: ["auth", "jarene", "booking"],
      }).percentage,
    ).toBe(40);
  });

  it("reaches 100 percent when Orders is installed too", () => {
    expect(
      calculateDashboardReadiness({
        hasAuthenticatedAdmin: true,
        brandName: "Arunika Energi",
        hasLogo: true,
        moduleNames: ["auth", "jarene", "catalog", "orders", "booking"],
      }),
    ).toMatchObject({ completed: 5, total: 5, percentage: 100 });
  });

  it("does not treat whitespace-only names or an absent logo as configured", () => {
    expect(
      calculateDashboardReadiness({
        hasAuthenticatedAdmin: true,
        brandName: "   ",
        hasLogo: false,
        moduleNames: ["catalog"],
      }).steps,
    ).toEqual([
      { id: "admin", complete: true },
      { id: "brand", complete: false },
      { id: "logo", complete: false },
      { id: "catalog", complete: true },
      { id: "orders", complete: false },
    ]);
  });
});
