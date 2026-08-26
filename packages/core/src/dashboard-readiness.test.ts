import { describe, expect, it } from "vitest";
import { calculateDashboardReadiness } from "./dashboard-readiness";

describe("calculateDashboardReadiness", () => {
  it("keeps the default Karsa workspace at admin-only progress", () => {
    expect(
      calculateDashboardReadiness({
        hasAuthenticatedAdmin: true,
        brandName: "Karsa",
        hasLogo: false,
        moduleNames: [],
      }),
    ).toMatchObject({ completed: 1, total: 3, percentage: 33 });
  });

  it("reports 40 percent for Arunika with Auth and Jarene only", () => {
    const readiness = calculateDashboardReadiness({
      hasAuthenticatedAdmin: true,
      brandName: "Arunika Energi",
      hasLogo: false,
      moduleNames: ["auth", "jarene"],
    });

    expect(readiness.percentage).toBe(67);
    expect(readiness.steps).toEqual([
      { id: "admin", complete: true },
      { id: "brand", complete: true },
      { id: "logo", complete: false },
    ]);
  });

  it("reaches 100 percent once the neutral identity is complete", () => {
    expect(
      calculateDashboardReadiness({
        hasAuthenticatedAdmin: true,
        brandName: "Arunika Energi",
        hasLogo: true,
        moduleNames: ["AUTH", "JARENE", "Catalog"],
      }).percentage,
    ).toBe(100);
  });

  it("ignores custom modules for launch readiness", () => {
    expect(
      calculateDashboardReadiness({
        hasAuthenticatedAdmin: true,
        brandName: "Arunika Energi",
        hasLogo: false,
        moduleNames: ["auth", "jarene", "booking"],
      }).percentage,
    ).toBe(67);
  });

  it("does not make readiness depend on installed business modules", () => {
    expect(
      calculateDashboardReadiness({
        hasAuthenticatedAdmin: true,
        brandName: "Arunika Energi",
        hasLogo: true,
        moduleNames: ["auth", "jarene", "catalog", "orders", "booking"],
      }),
    ).toMatchObject({ completed: 3, total: 3, percentage: 100 });
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
    ]);
  });
});
