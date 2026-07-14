import { amber, brand, green, neutral, red } from "@tokotuku/tokens";

export const light = {
  "color-bg": neutral[0],
  "color-bg-subtle": neutral[50],
  "color-fg": neutral[900],
  "color-fg-muted": neutral[600],
  "color-border": neutral[200],
  "color-accent": brand[600],
  "color-accent-fg": neutral[0],
  "color-danger": red[500],
  "color-warning": amber[500],
  "color-success": green[500],
  "color-focus-ring": brand[500],
} as const;

export type ThemeTokenName = keyof typeof light;
