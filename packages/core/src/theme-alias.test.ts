import { describe, expect, it } from "vitest";
import { buildThemeAliases } from "./theme-alias";

describe("buildThemeAliases", () => {
  it("aliases any import path ending in the theme file's name", () => {
    const [alias] = buildThemeAliases("/app/src/theme", ["ProductCard.astro"]);
    expect(alias?.replacement).toBe("/app/src/theme/ProductCard.astro");
    expect(alias?.find.test("@tokotuku/ui/ProductCard.astro")).toBe(true);
    expect(alias?.find.test("@tokotuku/ui/OtherCard.astro")).toBe(false);
  });

  it("ignores non-.astro files in the theme directory", () => {
    const aliases = buildThemeAliases("/app/src/theme", ["notes.md", "Button.astro"]);
    expect(aliases).toHaveLength(1);
    expect(aliases[0]?.replacement).toBe("/app/src/theme/Button.astro");
  });

  it("does not false-positive on a filename that is only a suffix of another", () => {
    const [alias] = buildThemeAliases("/app/src/theme", ["Card.astro"]);
    expect(alias?.find.test("@tokotuku/ui/ProductCard.astro")).toBe(false);
    expect(alias?.find.test("@tokotuku/ui/Card.astro")).toBe(true);
  });

  it("returns an empty array for an empty theme directory", () => {
    expect(buildThemeAliases("/app/src/theme", [])).toEqual([]);
  });
});
