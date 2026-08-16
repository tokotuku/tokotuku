import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export interface NormalizedModuleSpec {
  packageName: string;
  versionRange: string | null;
}

/**
 * Accepts a bare module name ("blog"), a scoped package name
 * ("@acme/loyalty"), or either with a trailing "@<range>" -- normalizing to
 * a package name plus an optional version range for the install step. A
 * bare name with no "/" is assumed to live under this framework's own
 * @takontuku scope.
 */
export function normalizeModuleSpec(spec: string): NormalizedModuleSpec {
  if (!spec.includes("/")) {
    const at = spec.indexOf("@", 1);
    if (at > 0)
      return { packageName: `@takontuku/${spec.slice(0, at)}`, versionRange: spec.slice(at + 1) };
    return { packageName: `@takontuku/${spec}`, versionRange: null };
  }
  const lastAt = spec.lastIndexOf("@");
  if (lastAt > 0) {
    return { packageName: spec.slice(0, lastAt), versionRange: spec.slice(lastAt + 1) };
  }
  return { packageName: spec, versionRange: null };
}

function rawLastSegment(packageName: string): string {
  return packageName.split("/").pop() ?? packageName;
}

/** camelCase guess for a module's factory export name from its package name's last path segment: "gift-cards" -> "giftCards". */
export function deriveExportNameGuess(packageName: string): string {
  return rawLastSegment(packageName).replace(/-([a-z0-9])/g, (_match, ch: string) =>
    ch.toUpperCase(),
  );
}

/** True if the package's own `exports` map ships a `"./register"` subpath -- the signal that its side-effect import needs a line in the client's middleware.ts. */
export function hasRegisterSubpath(pkgJson: { exports?: Record<string, unknown> }): boolean {
  return Boolean(pkgJson.exports && "./register" in pkgJson.exports);
}

export interface ModuleFactoryResult {
  exportName: string;
  moduleName: string;
  requires: string[];
}

interface ModuleDefinitionLike {
  name: string;
  requires?: string[];
}

function isModuleDefinitionLike(value: unknown): value is ModuleDefinitionLike {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { name?: unknown }).name === "string"
  );
}

/**
 * Picks the module factory among a package's exports: the guessed camelCase
 * name, then the raw last path segment, then -- if neither is a matching
 * zero-arity function -- every zero-arity export, called and kept only if
 * it returns a module-definition-shaped object. Exactly one candidate wins;
 * zero or more than one is a refusal, not a guess. Calling arbitrary
 * zero-arity exports here isn't a new risk: astro.config.mjs already
 * executes this same package's module code on every `takontuku db sync`.
 */
export function selectModuleFactory(
  namespace: Record<string, unknown>,
  packageName: string,
): ModuleFactoryResult {
  const tryName = (name: string): ModuleFactoryResult | null => {
    const candidate = namespace[name];
    if (typeof candidate !== "function" || candidate.length !== 0) return null;
    try {
      const result = (candidate as () => unknown)();
      if (!isModuleDefinitionLike(result)) return null;
      return { exportName: name, moduleName: result.name, requires: result.requires ?? [] };
    } catch {
      return null;
    }
  };

  const guess = deriveExportNameGuess(packageName);
  const byGuess = tryName(guess);
  if (byGuess) return byGuess;

  const rawSegment = rawLastSegment(packageName);
  if (rawSegment !== guess) {
    const byRaw = tryName(rawSegment);
    if (byRaw) return byRaw;
  }

  const candidates = Object.keys(namespace)
    .filter((name) => name !== guess && name !== rawSegment)
    .map((name) => tryName(name))
    .filter((result): result is ModuleFactoryResult => result !== null);

  if (candidates.length === 1) return candidates[0] as ModuleFactoryResult;
  if (candidates.length === 0) {
    throw new Error(
      `Could not tell which export of ${packageName} defines the module -- expected a zero-argument function returning a module definition, found none. Add the import and the modules[] entry to astro.config.mjs by hand.`,
    );
  }
  throw new Error(
    `${packageName} exports more than one module definition (${candidates
      .map((c) => `"${c.exportName}"`)
      .join(", ")}). Add the one you want to astro.config.mjs by hand.`,
  );
}

export interface ModulePackageInfo extends ModuleFactoryResult {
  packageName: string;
  hasRegisterExport: boolean;
}

interface RawPackageJson {
  exports?: Record<string, unknown>;
  module?: string;
  main?: string;
}

function resolveMainEntry(pkgJson: RawPackageJson): string {
  const dotExport = pkgJson.exports?.["."];
  if (dotExport && typeof dotExport === "object" && "import" in dotExport) {
    return (dotExport as { import: string }).import;
  }
  if (typeof dotExport === "string") return dotExport;
  return pkgJson.module ?? pkgJson.main ?? "index.js";
}

/**
 * Reads an installed @takontuku/*-shaped package's own package.json and
 * default export to determine its module factory, registry name,
 * dependencies, and whether it ships a "./register" side-effect import --
 * all four facts come from one probe, so callers never have to guess.
 */
export async function inspectModulePackage(
  cwd: string,
  packageName: string,
): Promise<ModulePackageInfo> {
  const packageDir = path.join(cwd, "node_modules", ...packageName.split("/"));
  const pkgJsonPath = path.join(packageDir, "package.json");
  let pkgJson: RawPackageJson;
  try {
    pkgJson = JSON.parse(await readFile(pkgJsonPath, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `Could not find ${packageName} in ${path.join(cwd, "node_modules")}. Run "bun install" first, or drop --no-install.`,
      );
    }
    throw error;
  }

  const hasRegisterExport = hasRegisterSubpath(pkgJson);
  const entryRelative = resolveMainEntry(pkgJson);
  const namespace = (await import(
    pathToFileURL(path.join(packageDir, entryRelative)).href
  )) as Record<string, unknown>;
  const factory = selectModuleFactory(namespace, packageName);

  return { packageName, hasRegisterExport, ...factory };
}
