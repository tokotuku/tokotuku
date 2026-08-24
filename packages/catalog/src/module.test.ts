import { describe, expect, it } from "vitest";
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
