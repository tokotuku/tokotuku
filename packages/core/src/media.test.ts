import { describe, expect, it } from "vitest";
import {
  extensionForMediaType,
  isPaymentProofType,
  isSafeRasterImageType,
  mediaUrl,
} from "./media";

describe("media type policy", () => {
  it("accepts inert raster images and rejects SVG", () => {
    expect(isSafeRasterImageType("image/webp")).toBe(true);
    expect(isSafeRasterImageType("image/svg+xml")).toBe(false);
    expect(isPaymentProofType("application/pdf")).toBe(true);
    expect(extensionForMediaType("image/jpeg")).toBe("jpg");
  });
});

describe("mediaUrl", () => {
  it("builds a URL under the generic media route for the given key", () => {
    expect(mediaUrl("catalog/widget.svg")).toBe("/api/images/catalog/widget.svg");
  });
});
