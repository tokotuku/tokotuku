import { amber, brand, green, neutral, red } from "@tokotuku/tokens";
import type { ThemeTokenName } from "./light.js";

export const dark: Record<ThemeTokenName, string> = {
  "color-bg": neutral[1000],
  "color-bg-subtle": neutral[900],
  "color-fg": neutral[50],
  "color-fg-muted": neutral[400],
  "color-border": neutral[700],
  "color-accent": brand[400],
  "color-accent-fg": neutral[1000],
  "color-danger": red[300],
  "color-warning": amber[300],
  "color-success": green[300],
  "color-focus-ring": brand[300],
};
