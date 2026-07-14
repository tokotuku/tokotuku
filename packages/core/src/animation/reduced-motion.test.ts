import { afterEach, describe, expect, it, vi } from "vitest";
import { prefersReducedMotion } from "./reduced-motion.js";

describe("prefersReducedMotion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns true when the media query matches", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }) as MediaQueryList);
    expect(prefersReducedMotion()).toBe(true);
  });

  it("returns false when the media query does not match", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }) as MediaQueryList);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("returns false when matchMedia is unavailable", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(prefersReducedMotion()).toBe(false);
  });
});
