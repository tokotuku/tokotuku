export interface PaletteColors {
  background?: string;
  surface?: string;
  subtle?: string;
  foreground?: string;
  mutedForeground?: string;
  border?: string;
  accent?: string;
  accentHover?: string;
  accentForeground?: string;
  focusRing?: string;
  sidebar?: string;
  sidebarForeground?: string;
  sidebarMutedForeground?: string;
  sidebarActive?: string;
  sidebarActiveForeground?: string;
}

const paletteVariables: Record<keyof PaletteColors, string> = {
  background: "--tk-color-bg",
  surface: "--tk-color-surface",
  subtle: "--tk-color-bg-subtle",
  foreground: "--tk-color-fg",
  mutedForeground: "--tk-color-fg-muted",
  border: "--tk-color-border",
  accent: "--tk-color-accent",
  accentHover: "--tk-color-accent-hover",
  accentForeground: "--tk-color-accent-fg",
  focusRing: "--tk-color-focus-ring",
  sidebar: "--admin-rail",
  sidebarForeground: "--admin-rail-fg",
  sidebarMutedForeground: "--admin-rail-muted",
  sidebarActive: "--admin-rail-active",
  sidebarActiveForeground: "--admin-rail-active-fg",
};

function serializePalette(palette: PaletteColors | undefined, mode: "light" | "dark"): string[] {
  if (!palette) return [];
  return Object.entries(palette).flatMap(([key, value]) => {
    const variable = paletteVariables[key as keyof PaletteColors];
    return variable && typeof value === "string" && value.trim()
      ? [
          `--tk-${mode}-${variable.startsWith("--tk-") ? variable.slice(5) : variable.slice(2)}:${value.trim()}`,
        ]
      : [];
  });
}

/** Serializes only known, configured palette keys for trusted brand CSS variables. */
export function paletteStyle(brand: {
  palette?: { light?: PaletteColors; dark?: PaletteColors };
}): string | undefined {
  const values = [
    ...serializePalette(brand.palette?.light, "light"),
    ...serializePalette(brand.palette?.dark, "dark"),
  ];
  return values.length ? values.join(";") : undefined;
}
