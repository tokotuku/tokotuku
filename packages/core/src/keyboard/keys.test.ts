import { describe, expect, it } from "vitest";
import { isKey, Keys } from "./keys.js";

describe("isKey", () => {
  it("matches when the event key equals the given key", () => {
    const event = new KeyboardEvent("keydown", { key: Keys.Escape });
    expect(isKey(event, Keys.Escape)).toBe(true);
  });

  it("does not match a different key", () => {
    const event = new KeyboardEvent("keydown", { key: Keys.Enter });
    expect(isKey(event, Keys.Escape)).toBe(false);
  });
});
