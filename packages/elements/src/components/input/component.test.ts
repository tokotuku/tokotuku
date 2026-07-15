import { cleanupFixtures, fixture } from "@tokotuku/testing";
import { afterEach, describe, expect, it } from "vitest";
import "./component.js";
import type { TkInput } from "./component.js";

describe("tk-input", () => {
  afterEach(() => {
    cleanupFixtures();
  });

  it("registers as tk-input", () => {
    const input = fixture<TkInput>("<tk-input></tk-input>");
    expect(input.tagName.toLowerCase()).toBe("tk-input");
  });

  it("defaults to type=text", () => {
    const input = fixture<TkInput>("<tk-input></tk-input>");
    expect(input.type).toBe("text");
    expect(input.value).toBe("");
  });

  it("renders a label associated with the internal input", async () => {
    const input = fixture<TkInput>('<tk-input label="Email"></tk-input>');
    await input.updateComplete;
    const label = input.shadowRoot?.querySelector("label");
    const inner = input.shadowRoot?.querySelector("input");
    expect(label?.textContent).toBe("Email");
    expect(label?.getAttribute("for")).toBe(inner?.id);
  });

  it("updates value and dispatches tk-change on native input", async () => {
    const input = fixture<TkInput>('<tk-input type="email"></tk-input>');
    await input.updateComplete;
    const inner = input.shadowRoot?.querySelector("input") as HTMLInputElement;

    let detail: { value: string } | undefined;
    input.addEventListener("tk-change", (event) => {
      detail = (event as CustomEvent<{ value: string }>).detail;
    });

    inner.value = "user@example.com";
    inner.dispatchEvent(new Event("input"));

    expect(input.value).toBe("user@example.com");
    expect(detail).toEqual({ value: "user@example.com" });
  });

  it("forwards required and disabled to the internal input", async () => {
    const input = fixture<TkInput>("<tk-input required disabled></tk-input>");
    await input.updateComplete;
    const inner = input.shadowRoot?.querySelector("input");
    expect(inner?.required).toBe(true);
    expect(inner?.disabled).toBe(true);
  });
});
