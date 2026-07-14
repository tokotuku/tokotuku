import { afterEach, describe, expect, it } from "vitest";
import { cleanupFixtures, fixture } from "./fixture.js";

describe("fixture", () => {
  afterEach(() => {
    cleanupFixtures();
  });

  it("mounts markup into the document body and returns the root element", () => {
    const element = fixture<HTMLButtonElement>("<button>Click me</button>");

    expect(element.tagName).toBe("BUTTON");
    expect(document.body.contains(element)).toBe(true);
  });

  it("throws when the markup has no root element", () => {
    expect(() => fixture("   ")).toThrow();
  });

  it("removes all mounted fixtures on cleanup", () => {
    const element = fixture("<div></div>");
    cleanupFixtures();
    expect(document.body.contains(element)).toBe(false);
  });
});
