import {
  duration,
  easing,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  radius,
  shadow,
  spacing,
} from "@tokotuku/tokens";
import { toCssCustomProperties } from "./css.js";

function prefixed(prefix: string, values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [`${prefix}-${key}`, value]),
  );
}

const baseTokens: Record<string, string> = {
  ...prefixed("spacing", spacing),
  ...prefixed("radius", radius),
  ...prefixed("shadow", shadow),
  ...prefixed("duration", duration),
  ...prefixed("easing", easing),
  ...prefixed("font-family", fontFamily),
  ...prefixed("font-size", fontSize),
  ...prefixed("font-weight", fontWeight),
  ...prefixed("line-height", lineHeight),
};

// Theme-independent design tokens (spacing, radius, shadow, duration, typography) —
// unlike palettes these don't vary by light/dark/high-contrast, so they're always active.
export const tokenCss = toCssCustomProperties(":root", baseTokens);
