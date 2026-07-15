import { cleanupFixtures, fixture } from "@tokotuku/testing";
import { afterEach, describe, expect, it } from "vitest";
import "./component.js";
import type { TkCard } from "./component.js";

describe("tk-card", () => {
  afterEach(() => {
    cleanupFixtures();
  });

  it("registers as tk-card", () => {
    const card = fixture<TkCard>("<tk-card></tk-card>");
    expect(card.tagName.toLowerCase()).toBe("tk-card");
  });

  it("exposes media, default, and footer slots", async () => {
    const card = fixture<TkCard>(`
      <tk-card>
        <img slot="media" src="widget.svg" alt="Widget" />
        <h2>Widget</h2>
        <span slot="footer">$19.99</span>
      </tk-card>
    `);
    await card.updateComplete;

    const mediaSlot = card.shadowRoot?.querySelector('slot[name="media"]') as HTMLSlotElement;
    const footerSlot = card.shadowRoot?.querySelector('slot[name="footer"]') as HTMLSlotElement;
    const defaultSlot = card.shadowRoot?.querySelector("slot:not([name])") as HTMLSlotElement;

    expect(mediaSlot.assignedElements()[0]?.tagName).toBe("IMG");
    expect(footerSlot.assignedElements()[0]?.textContent).toBe("$19.99");
    expect(defaultSlot.assignedElements()[0]?.tagName).toBe("H2");
  });
});
