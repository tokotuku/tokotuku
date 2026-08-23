import { describe, expect, it } from "vitest";
import { jareneQuotes, pickJareneQuote } from "./quotes";

describe("Jarene quote catalog", () => {
  it("keeps a curated, attributable quote for each supported discipline", () => {
    expect(jareneQuotes.length).toBeGreaterThanOrEqual(6);
    expect(new Set(jareneQuotes.map((quote) => quote.id)).size).toBe(jareneQuotes.length);
    expect(new Set(jareneQuotes.map((quote) => quote.discipline.id))).toEqual(
      new Set(["Ekonom", "Matematikawan", "Ilmuwan"]),
    );

    for (const quote of jareneQuotes) {
      expect(quote.original).not.toBe(quote.translated);
      expect(quote.author).not.toHaveLength(0);
      expect(quote.source.url).toMatch(/^https?:\/\//);
      expect(quote.source.detail).not.toHaveLength(0);
    }
  });

  it("selects deterministically from a server-side random value", () => {
    expect(pickJareneQuote(0)).toBe(jareneQuotes[0]);
    expect(pickJareneQuote(0.999999)).toBe(jareneQuotes.at(-1));
    expect(pickJareneQuote(Number.NaN)).toBe(jareneQuotes[0]);
    expect(pickJareneQuote(-1)).toBe(jareneQuotes[0]);
  });
});
