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

export interface Palette {
  light?: PaletteColors;
  dark?: PaletteColors;
}

const paletteVariables: Record<keyof PaletteColors, string> = {
  background: "--karsa-color-bg",
  surface: "--karsa-color-surface",
  subtle: "--karsa-color-bg-subtle",
  foreground: "--karsa-color-fg",
  mutedForeground: "--karsa-color-fg-muted",
  border: "--karsa-color-border",
  accent: "--karsa-color-accent",
  accentHover: "--karsa-color-accent-hover",
  accentForeground: "--karsa-color-accent-fg",
  focusRing: "--karsa-color-focus-ring",
  sidebar: "--admin-rail",
  sidebarForeground: "--admin-rail-fg",
  sidebarMutedForeground: "--admin-rail-muted",
  sidebarActive: "--admin-rail-active",
  sidebarActiveForeground: "--admin-rail-active-fg",
};

const functionalColorPattern =
  /^(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark|contrast-color)\([^{};]*\)$/i;
const customColorPattern = /^var\(--[a-z0-9_-]+(?:\s*,\s*[^{};]+)?\)$/i;
const namedColorPattern = /^[a-z]+(?:-[a-z]+)?$/i;
const namedColors = new Set(
  "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen transparent currentcolor inherit initial revert revert-layer unset".split(
    " ",
  ),
);

function isSafeColor(value: string): boolean {
  if (value.length > 200) return false;
  if (/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value)) return true;
  if (functionalColorPattern.test(value) || customColorPattern.test(value)) return true;
  return namedColorPattern.test(value) && namedColors.has(value.toLowerCase());
}

function serializeColors(colors: PaletteColors | undefined, mode: "light" | "dark"): string[] {
  if (!colors) return [];

  return Object.entries(colors).flatMap(([key, value]) => {
    const variable = paletteVariables[key as keyof PaletteColors];
    if (!variable || typeof value !== "string") return [];

    const normalized = value.trim();
    if (!normalized || !isSafeColor(normalized)) return [];

    const suffix = variable.startsWith("--karsa-")
      ? variable.slice("--karsa-".length)
      : variable.slice(2);
    return [`--karsa-${mode}-${suffix}:${normalized}`];
  });
}

/** Serialize known palette keys into the CSS variable contract used by Karsa. */
export function paletteStyle(input: { palette?: Palette }): string | undefined {
  const values = [
    ...serializeColors(input.palette?.light, "light"),
    ...serializeColors(input.palette?.dark, "dark"),
  ];

  if (values.length === 0) return undefined;
  return values.join(";");
}
