import { describe, expect, it } from "vitest";
import { bookingMessages } from "./messages";

describe("booking message dictionaries", () => {
  it("keep Indonesian and English keys in sync", () => {
    expect(Object.keys(bookingMessages.id).sort()).toEqual(Object.keys(bookingMessages.en).sort());
  });
});
