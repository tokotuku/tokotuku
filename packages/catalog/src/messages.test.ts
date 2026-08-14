import { describe, expect, it } from "vitest";
import { catalogMessages } from "./messages";

describe("catalog message dictionaries", () => {
  it("keep Indonesian and English keys in sync", () => {
    expect(Object.keys(catalogMessages.id).sort()).toEqual(Object.keys(catalogMessages.en).sort());
  });
});
