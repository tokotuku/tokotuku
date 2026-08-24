import { describe, expect, it } from "vitest";
import { catalogItemInputFromForm } from "./catalog-item-form";
import { catalog } from "./index";

describe("catalog module factory", () => {
  it("keeps product presentation as the zero-argument CLI default", () => {
    expect(catalog.length).toBe(0);
    expect(catalog().clientConfig).toEqual({ presentation: "products" });
    expect(catalog({ presentation: "services" }).clientConfig).toEqual({
      presentation: "services",
    });
  });
});

describe("catalog image uploads", () => {
  it("rejects active SVG content types", async () => {
    const form = new FormData();
    form.set("name", "Widget");
    form.set("description", "A widget");
    form.set("sku", "W-1");
    form.set("category", "Tools");
    form.set("price", "10");
    form.set("stock", "1");
    form.set("image", new File(["<svg></svg>"], "payload.svg", { type: "image/svg+xml" }));
    await expect(
      catalogItemInputFromForm(form, { put: async () => undefined } as never),
    ).rejects.toThrow(/gambar|image/i);
  });
});
