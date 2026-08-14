export interface ThemeAlias {
  find: RegExp;
  replacement: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds one Vite alias per `.astro` file in the theme directory, redirecting
 * any import path ending in that filename to the theme's version. Matching
 * by filename alone (not full package specifier) is the deliberately simple
 * version — see task 0.4 notes on why a stricter per-package resolver waits
 * for a second real client that needs it.
 *
 * `find` must match the whole specifier, not just the filename suffix:
 * Vite's alias plugin resolves via `id.replace(find, replacement)`, so a
 * `find` of `/ProductCard\.astro$` against `"@tokotuku/ui/ProductCard.astro"`
 * would replace only the matched suffix, leaving the package prefix stuck
 * onto the front of the replacement (`"@tokotuku/ui/app/src/theme/...`).
 * Anchoring the start of the pattern too makes the match, and so the
 * replace, cover the whole string.
 */
export function buildThemeAliases(themeDir: string, filenames: string[]): ThemeAlias[] {
  return filenames
    .filter((name) => name.endsWith(".astro"))
    .map((name) => ({
      find: new RegExp(`^.*/${escapeRegExp(name)}$`),
      replacement: `${themeDir}/${name}`,
    }));
}
