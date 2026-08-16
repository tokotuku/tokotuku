import { scanImports } from "./astro-config";

/**
 * Inserts `import "specifier";` among the contiguous block of existing
 * `@takontuku/*\/register` side-effect imports at the top of middleware.ts,
 * sorted by specifier -- falls back to appending after the last import
 * declaration when that block is empty. No-op if already present.
 */
export function addRegisterImport(source: string, specifier: string): string {
  const decls = scanImports(source);
  if (decls.some((decl) => decl.specifier === specifier)) return source;

  const registerDecls = decls.filter((decl) => decl.specifier.endsWith("/register"));
  const insertAt =
    registerDecls.find((decl) => decl.specifier > specifier)?.start ??
    registerDecls.at(-1)?.end ??
    decls.at(-1)?.end ??
    0;
  const line = `import "${specifier}";\n`;
  return source.slice(0, insertAt) + line + source.slice(insertAt);
}

/** Removes the `import "specifier";` declaration, if present. No-op otherwise. */
export function removeRegisterImport(source: string, specifier: string): string {
  const decl = scanImports(source).find((d) => d.specifier === specifier);
  if (!decl) return source;
  return source.slice(0, decl.start) + source.slice(decl.end);
}
