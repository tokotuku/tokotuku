import { describe, expect, it } from "vitest";
import { ELEMENT_PREFIX, eventName, tagName } from "./constants.js";

describe("constants", () => {
  it("prefixes tag names with the tk- prefix", () => {
    expect(tagName("button")).toBe(`${ELEMENT_PREFIX}-button`);
  });

  it("prefixes event names with the tk- prefix", () => {
    expect(eventName("change")).toBe(`${ELEMENT_PREFIX}-change`);
  });
});
