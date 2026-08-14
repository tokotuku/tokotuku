import { describe, expect, it } from "vitest";
import { mediaUrl } from "./media";

describe("mediaUrl", () => {
  it("builds a URL under the generic media route for the given key", () => {
    expect(mediaUrl("catalog/widget.svg")).toBe("/api/images/catalog/widget.svg");
  });
});
