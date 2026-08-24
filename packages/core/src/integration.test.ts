import { describe, expect, it } from "vitest";
import { karsa } from "./integration";

describe("karsa integration", () => {
  it("fails before Astro setup when a module requires missing currency", () => {
    expect(() =>
      karsa({
        brand: { name: "A site", locale: "en-US" },
        modules: [{ name: "catalog", requiredBrandFields: ["currency"] }],
      }),
    ).toThrow("Karsa configuration error: installed modules require brand.currency.");
  });

  it("accepts a site-neutral installation without currency", () => {
    expect(
      karsa({
        brand: { name: "A publication", locale: "en-US", timeZone: "UTC" },
        modules: [{ name: "content" }],
      }).registry.requiredBrandFields,
    ).toEqual([]);
  });
});
