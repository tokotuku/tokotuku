import { toCssCustomProperties } from "./css.js";
import { dark } from "./palettes/dark.js";
import { highContrast } from "./palettes/high-contrast.js";
import { light } from "./palettes/light.js";
import { tokenCss } from "./tokens.js";

export * from "./css.js";
export * from "./palettes/dark.js";
export * from "./palettes/high-contrast.js";
export * from "./palettes/light.js";
export * from "./tokens.js";

export const lightCss = toCssCustomProperties(':root, [data-theme="light"]', light);
export const darkCss = toCssCustomProperties('[data-theme="dark"]', dark);
export const highContrastCss = toCssCustomProperties('[data-theme="high-contrast"]', highContrast);

// Falls back to the OS preference only when no explicit data-theme is set.
export const systemDarkCss = `@media (prefers-color-scheme: dark) {\n${toCssCustomProperties(
  ":root:not([data-theme])",
  dark,
)}\n}`;

export const themeCss = [tokenCss, lightCss, darkCss, highContrastCss, systemDarkCss].join("\n\n");
