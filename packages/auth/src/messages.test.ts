import { describe, expect, it } from "vitest";
import { authMessages } from "./messages";

describe("auth message dictionaries", () => {
  it("keep Indonesian and English keys in sync", () => {
    expect(Object.keys(authMessages.id).sort()).toEqual(Object.keys(authMessages.en).sort());
  });
});
