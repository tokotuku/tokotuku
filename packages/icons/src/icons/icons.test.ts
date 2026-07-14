import { describe, expect, it } from "vitest";
import { chevronDownIcon } from "./chevron-down.js";
import { closeIcon } from "./close.js";

describe.each([
  ["closeIcon", closeIcon],
  ["chevronDownIcon", chevronDownIcon],
])("%s", (_name, icon) => {
  it("is a single root <svg> element with a viewBox", () => {
    expect(icon.trim().startsWith("<svg")).toBe(true);
    expect(icon).toContain('viewBox="0 0 24 24"');
  });

  it("uses currentColor so it inherits color from CSS", () => {
    expect(icon).toContain('stroke="currentColor"');
  });
});
