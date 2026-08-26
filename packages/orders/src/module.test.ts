import { describe, expect, it } from "vitest";
import { orders } from "./index";

describe("orders module factory", () => {
  it("keeps order presentation as the zero-argument CLI default", () => {
    expect(orders.length).toBe(0);
    expect(orders().clientConfig).toEqual({ presentation: "orders" });
    expect(orders({ presentation: "inquiries" }).clientConfig).toEqual({
      presentation: "inquiries",
    });
  });
});
