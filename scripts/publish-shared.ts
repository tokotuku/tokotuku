// Shared helpers for publish-private.ts and publish-local.ts: both publish
// @karsa/* packages to a registry by stamping `private` off and
// workspace:* dependencies to real versions in memory, then restoring the
// file from disk afterward regardless of outcome. This is that shared
// mechanism, factored out once both scripts turned out to need the exact
// same ~60 lines almost verbatim.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("..", import.meta.url));

/**
 * Modeled with real fields instead of `Record<string, unknown>` so `.name`,
 * `.version`, `.private`, and the dependency maps are ordinary property
 * access -- an index-signature type forces a choice between TypeScript's
 * noPropertyAccessFromIndexSignature (wants bracket access) and Biome's
 * useLiteralKeys (wants dot access) that has no answer satisfying both.
 * The index signature keeps every other field (exports, files, bin, ...)
 * along for the ride through JSON.parse/JSON.stringify without needing to
 * be named here.
 */
export interface PackageJson {
  name: string;
  version: string;
  private?: boolean;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  [key: string]: unknown;
}

const DEP_FIELDS = ["dependencies", "devDependencies", "peerDependencies"] as const;

/** Maps an @karsa/* package name to the directory it lives in, for resolving workspace:* references. */
export const DIR_BY_PACKAGE_NAME: Record<string, string> = {
  "@karsa/core": "packages/core",
  "@karsa/theme": "packages/theme",
  "@karsa/ui": "packages/ui",
  "@karsa/auth": "packages/auth",
  "@karsa/config": "configs",
  "@karsa/charts": "packages/charts",
  "@karsa/jarene": "packages/jarene",
  "@karsa/catalog": "packages/catalog",
  "@karsa/orders": "packages/orders",
  "@karsa/booking": "packages/booking",
  "@karsa/content": "packages/content",
};

export function sh(command: string, args: string[], cwd: string): void {
  console.log(`+ ${command} ${args.join(" ")}  (in ${path.relative(ROOT, cwd) || "."})`);
  execFileSync(command, args, { cwd, stdio: "inherit" });
}

/** Build a dependency-ordered set without requiring Moon's remote toolchain plugins. */
export function runWorkspaceBuilds(directories: string[]): void {
  for (const directory of directories) {
    sh("bun", ["run", "build"], path.join(ROOT, directory));
  }
}

export function readJson(filePath: string): PackageJson {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function writeJson(filePath: string, value: PackageJson): void {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

/** The real, currently checked-in version of a workspace package, by its package name. */
export function resolveVersion(packageName: string): string {
  const dir = DIR_BY_PACKAGE_NAME[packageName];
  if (!dir) throw new Error(`Don't know which directory ${packageName} lives in`);
  return readJson(path.join(ROOT, dir, "package.json")).version;
}

const NPMRC_PATH = path.join(ROOT, ".npmrc");

/**
 * `bun publish`'s auth-token lookup for an UNSCOPED package name (only
 * create-karsa, of everything these scripts publish) needs a literal
 * default `registry=` line in .npmrc to anchor to -- verified empirically
 * that neither `--registry` on the command line nor `npm_config_registry` /
 * `npm_config__authtoken` env vars are enough on their own. Scoped
 * @karsa/* packages don't have this problem: `@karsa:registry=`
 * already gives bun that anchor by itself.
 *
 * The persistent repo .npmrc deliberately has no default `registry=` line
 * -- one there routes every OTHER package's `bun install` through whatever
 * registry this points at too, which is exactly the mechanism that once
 * silently filled bun.lock with local Verdaccio tarball URLs for ordinary
 * third-party dependencies like astro. So this adds the line back only for
 * the duration of publishing, then restores the file exactly (or removes
 * it, if it didn't exist before), regardless of outcome.
 */
export function withDefaultRegistryForPublish<T>(registry: string, fn: () => T): T {
  let original: string | null;
  try {
    original = readFileSync(NPMRC_PATH, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    original = null;
  }
  if (original?.split("\n").some((line) => line.startsWith("registry="))) {
    return fn();
  }
  try {
    writeFileSync(NPMRC_PATH, `${original ?? ""}registry=${registry}\n`);
    return fn();
  } finally {
    if (original === null) {
      execFileSync("rm", [NPMRC_PATH]);
    } else {
      writeFileSync(NPMRC_PATH, original);
    }
  }
}

/**
 * Runs `bun publish`, treating "this version already exists on the
 * registry" as a non-fatal, expected outcome. Both callers re-run this
 * often while iterating locally, and re-publishing an unchanged version is
 * exactly what happens every time nothing bumped since the last run --
 * bump the package's version (or wipe the registry's storage) to actually
 * push new content.
 */
export function publishOrSkipIfExists(
  registry: string,
  cwd: string,
  extraArgs: string[] = [],
): void {
  const args = ["publish", "--registry", registry, ...extraArgs];
  console.log(`+ bun ${args.join(" ")}  (in ${path.relative(ROOT, cwd) || "."})`);
  try {
    execFileSync("bun", args, { cwd, stdio: ["ignore", "inherit", "pipe"] });
  } catch (error) {
    const stderr = (error as { stderr?: Buffer }).stderr?.toString() ?? "";
    process.stderr.write(stderr);
    if (stderr.includes("already present") || stderr.includes("409 Conflict")) {
      console.log("(already published at this version -- skipping)");
      return;
    }
    throw error;
  }
}

export interface PublishOptions {
  dir: string;
  registry: string;
  dryRun?: boolean;
  /** Runs right after reading package.json, before any mutation -- e.g. refusing an unversioned 0.0.0. */
  guard?: (pkg: PackageJson) => void;
}

/**
 * Registries refuse `private: true` and require every workspace:*
 * dependency to resolve to a real version -- neither is true for these
 * packages as checked in. Stamps both in memory, publishes, and restores
 * the file from disk afterward regardless of outcome.
 */
export function publishPackage({ dir, registry, dryRun, guard }: PublishOptions): void {
  const pkgPath = path.join(ROOT, dir, "package.json");
  const original = readFileSync(pkgPath, "utf8");
  try {
    const pkg = readJson(pkgPath);
    guard?.(pkg);
    delete pkg.private;
    for (const depField of DEP_FIELDS) {
      const deps = pkg[depField];
      if (!deps) continue;
      for (const name of Object.keys(deps)) {
        if (deps[name] === "workspace:*") deps[name] = resolveVersion(name);
      }
    }
    writeJson(pkgPath, pkg);
    publishOrSkipIfExists(registry, path.join(ROOT, dir), dryRun ? ["--dry-run"] : []);
  } finally {
    writeFileSync(pkgPath, original);
  }
}
