import { describe, expect, it } from "vitest";
import { orderMessages } from "./messages";

describe("orders message dictionaries", () => {
  it("keep Indonesian and English keys in sync", () => {
    expect(Object.keys(orderMessages.id).sort()).toEqual(Object.keys(orderMessages.en).sort());
  });
});
