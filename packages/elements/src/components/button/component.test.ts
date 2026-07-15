import { cleanupFixtures, fixture } from "@tokotuku/testing";
import { afterEach, describe, expect, it } from "vitest";
import "./component.js";
import type { TkButton } from "./component.js";

describe("tk-button", () => {
  afterEach(() => {
    cleanupFixtures();
  });

  it("registers as tk-button", () => {
    const button = fixture<TkButton>("<tk-button>Save</tk-button>");
    expect(button.tagName.toLowerCase()).toBe("tk-button");
  });

  it("defaults to variant=primary, size=md, type=button", () => {
    const button = fixture<TkButton>("<tk-button>Save</tk-button>");
    expect(button.variant).toBe("primary");
    expect(button.size).toBe("md");
    expect(button.type).toBe("button");
    expect(button.disabled).toBe(false);
  });

  it("reflects variant, size, and disabled as attributes", async () => {
    const button = fixture<TkButton>("<tk-button>Save</tk-button>");
    button.variant = "secondary";
    button.size = "lg";
    button.disabled = true;
    await button.updateComplete;
    expect(button.getAttribute("variant")).toBe("secondary");
    expect(button.getAttribute("size")).toBe("lg");
    expect(button.hasAttribute("disabled")).toBe(true);
  });

  it("forwards type and disabled to the internal native button", async () => {
    const button = fixture<TkButton>('<tk-button type="submit" disabled>Save</tk-button>');
    await button.updateComplete;
    const inner = button.shadowRoot?.querySelector("button");
    expect(inner?.getAttribute("type")).toBe("submit");
    expect(inner?.disabled).toBe(true);
  });

  it("renders slotted content", () => {
    const button = fixture<TkButton>("<tk-button>Save</tk-button>");
    expect(button.textContent?.trim()).toBe("Save");
  });
});
