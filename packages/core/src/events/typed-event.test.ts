import { describe, expect, it } from "vitest";
import { TypedEvent } from "./typed-event.js";

interface ChangePayload {
  value: string;
}

describe("TypedEvent", () => {
  it("carries a typed detail payload", () => {
    const event = new TypedEvent<ChangePayload>("tk-change", { detail: { value: "ok" } });
    expect(event.type).toBe("tk-change");
    expect(event.detail.value).toBe("ok");
  });

  it("bubbles and composes across shadow boundaries by default", () => {
    const event = new TypedEvent<ChangePayload>("tk-change", { detail: { value: "ok" } });
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
  });

  it("allows overriding bubbles/composed", () => {
    const event = new TypedEvent<ChangePayload>("tk-change", {
      detail: { value: "ok" },
      bubbles: false,
      composed: false,
    });
    expect(event.bubbles).toBe(false);
    expect(event.composed).toBe(false);
  });
});
