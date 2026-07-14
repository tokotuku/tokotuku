import { describe, expect, it } from "vitest";
import { queryFocusable } from "./query-focusable.js";

describe("queryFocusable", () => {
  it("returns only focusable descendants, in document order", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <button>one</button>
      <div>not focusable</div>
      <input type="text" />
      <button disabled>disabled</button>
      <a href="#">link</a>
    `;

    const result = queryFocusable(container);

    expect(result.map((el) => el.tagName)).toEqual(["BUTTON", "INPUT", "A"]);
  });
});
