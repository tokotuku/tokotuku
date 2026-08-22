import { describe, expect, it } from "vitest";
import { paletteStyle } from "./theme";

describe("paletteStyle", () => {
  it("returns no inline override for an empty palette", () => {
    expect(paletteStyle({})).toBeUndefined();
    expect(paletteStyle({ palette: {} })).toBeUndefined();
  });

  it("keeps the legacy accent-only palette valid", () => {
    expect(
      paletteStyle({ palette: { light: { accent: "#765038", accentForeground: "#fff9f0" } } }),
    ).toBe("--tk-light-color-accent:#765038;--tk-light-color-accent-fg:#fff9f0");
  });

  it("serializes every supported light and dark key to mode-scoped variables", () => {
    const light = {
      background: "#1",
      surface: "#2",
      subtle: "#3",
      foreground: "#4",
      mutedForeground: "#5",
      border: "#6",
      accent: "#7",
      accentHover: "#8",
      accentForeground: "#9",
      focusRing: "#a",
      sidebar: "#b",
      sidebarForeground: "#c",
      sidebarMutedForeground: "#d",
      sidebarActive: "#e",
      sidebarActiveForeground: "#f",
    };
    const output = paletteStyle({ palette: { light, dark: { accent: "#abc" } } });
    expect(output).toContain("--tk-light-color-bg:#1");
    expect(output).toContain("--tk-light-admin-rail-active-fg:#f");
    expect(output).toContain("--tk-dark-color-accent:#abc");
  });

  it("drops unknown keys instead of emitting arbitrary custom properties", () => {
    const output = paletteStyle({
      palette: { light: { accent: "#765038", unknown: "red" } as never },
    });
    expect(output).toBe("--tk-light-color-accent:#765038");
    expect(output).not.toContain("unknown");
  });
});
