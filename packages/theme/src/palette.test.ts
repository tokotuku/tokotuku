import { describe, expect, it } from "vitest";
import { paletteStyle } from "./palette";

describe("paletteStyle", () => {
  it("returns no inline override for an empty palette", () => {
    expect(paletteStyle({})).toBeUndefined();
    expect(paletteStyle({ palette: {} })).toBeUndefined();
  });

  it("keeps the legacy accent-only palette valid", () => {
    expect(
      paletteStyle({ palette: { light: { accent: "#765038", accentForeground: "#fff9f0" } } }),
    ).toBe("--karsa-light-color-accent:#765038;--karsa-light-color-accent-fg:#fff9f0");
  });

  it("serializes every supported light and dark key to mode-scoped variables", () => {
    const light = {
      background: "#111111",
      surface: "#222222",
      subtle: "#333333",
      foreground: "#444444",
      mutedForeground: "#555555",
      border: "#666666",
      accent: "#777777",
      accentHover: "#888888",
      accentForeground: "#999999",
      focusRing: "#aaaaaa",
      sidebar: "#bbbbbb",
      sidebarForeground: "#cccccc",
      sidebarMutedForeground: "#dddddd",
      sidebarActive: "#eeeeee",
      sidebarActiveForeground: "#ffffff",
    };
    const output = paletteStyle({ palette: { light, dark: { accent: "#abc" } } });
    expect(output).toContain("--karsa-light-color-bg:#111111");
    expect(output).toContain("--karsa-light-admin-rail-active-fg:#ffffff");
    expect(output).toContain("--karsa-dark-color-accent:#abc");
  });

  it("drops unknown keys instead of emitting arbitrary custom properties", () => {
    const output = paletteStyle({
      palette: { light: { accent: "#765038", unknown: "red" } as never },
    });
    expect(output).toBe("--karsa-light-color-accent:#765038");
    expect(output).not.toContain("unknown");
  });

  it("rejects malformed or injectable color values", () => {
    expect(
      paletteStyle({
        palette: { light: { accent: "#12", border: "red;--karsa-dark-color-bg:black" } },
      }),
    ).toBeUndefined();
    expect(paletteStyle({ palette: { dark: { accent: "rgb(10 20 30 / 50%)" } } })).toContain(
      "--karsa-dark-color-accent:rgb(10 20 30 / 50%)",
    );
    expect(
      paletteStyle({ palette: { light: { border: "color-mix(in srgb, red 20%, blue)" } } }),
    ).toContain("--karsa-light-color-border:color-mix(in srgb, red 20%, blue)");
  });
});
