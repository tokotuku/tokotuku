import { describe, expect, it } from "vitest";
import { buildThemeAliases } from "./theme-alias";

describe("buildThemeAliases", () => {
  it("aliases any import path ending in the theme file's name", () => {
    const [alias] = buildThemeAliases("/app/src/theme", ["ProductCard.astro"]);
    expect(alias?.replacement).toBe("/app/src/theme/ProductCard.astro");
    expect(alias?.find.test("@takontuku/ui/ProductCard.astro")).toBe(true);
    expect(alias?.find.test("@takontuku/ui/OtherCard.astro")).toBe(false);
  });

  it("ignores non-.astro files in the theme directory", () => {
    const aliases = buildThemeAliases("/app/src/theme", ["notes.md", "Button.astro"]);
    expect(aliases).toHaveLength(1);
    expect(aliases[0]?.replacement).toBe("/app/src/theme/Button.astro");
  });

  it("does not false-positive on a filename that is only a suffix of another", () => {
    const [alias] = buildThemeAliases("/app/src/theme", ["Card.astro"]);
    expect(alias?.find.test("@takontuku/ui/ProductCard.astro")).toBe(false);
    expect(alias?.find.test("@takontuku/ui/Card.astro")).toBe(true);
  });

  it("returns an empty array for an empty theme directory", () => {
    expect(buildThemeAliases("/app/src/theme", [])).toEqual([]);
  });

  // Vite's alias plugin resolves via `id.replace(find, replacement)`, not
  // just `find.test(id)` -- a `find` that only anchors the end of the
  // string (the original bug) leaves the matched specifier's prefix stuck
  // onto the front of the replacement instead of overwriting the whole id.
  it("replaces the entire specifier, not just the matched suffix", () => {
    const [alias] = buildThemeAliases("/app/src/theme", ["ProductCard.astro"]);
    const id = "@takontuku/ui/ProductCard.astro";
    expect(id.replace(alias?.find as RegExp, alias?.replacement as string)).toBe(
      "/app/src/theme/ProductCard.astro",
    );
  });

  it("still does not replace a filename that is only a suffix of another", () => {
    const [alias] = buildThemeAliases("/app/src/theme", ["Card.astro"]);
    const id = "@takontuku/ui/ProductCard.astro";
    expect(id.replace(alias?.find as RegExp, alias?.replacement as string)).toBe(id);
  });
});
