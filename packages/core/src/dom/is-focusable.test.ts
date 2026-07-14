import { describe, expect, it } from "vitest";
import { isFocusable } from "./is-focusable.js";

describe("isFocusable", () => {
  it("returns true for an enabled button", () => {
    const button = document.createElement("button");
    document.body.append(button);
    expect(isFocusable(button)).toBe(true);
    button.remove();
  });

  it("returns false for a disabled button", () => {
    const button = document.createElement("button");
    button.disabled = true;
    expect(isFocusable(button)).toBe(false);
  });

  it("returns false for aria-disabled elements", () => {
    const button = document.createElement("button");
    button.setAttribute("aria-disabled", "true");
    expect(isFocusable(button)).toBe(false);
  });

  it("returns false for a negative tabindex", () => {
    const div = document.createElement("div");
    div.setAttribute("tabindex", "-1");
    expect(isFocusable(div)).toBe(false);
  });

  it("returns false for a plain div with no tabindex", () => {
    const div = document.createElement("div");
    expect(isFocusable(div)).toBe(false);
  });
});
