#!/usr/bin/env bun
/**
 * Publishes every @takontuku/* package -- public and private alike -- to a
 * single local registry at whatever version is currently checked into its
 * package.json. Lets you rehearse an entire release, including the public
 * packages that normally only ever reach real npm via CI, without touching
 * npmjs.org at all.
 *
 * Complements scripts/publish-private.ts, which only ever targets
 * catalog/orders against a real private registry. This one is for local
 * rehearsal only: it publishes all seven packages and defaults to the same
 * local Verdaccio every other local tool in this repo talks to.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DRY_RUN = process.argv.includes("--dry-run");
const REGISTRY = process.env.LOCAL_REGISTRY_URL ?? "http://localhost:4873";

// Publish order matters: workspace:* references must resolve to an
// already-published version. ui has no build step (it publishes .astro/.css
// source directly), so it's absent from the build list further down.
const PACKAGES = [
  "configs",
  "packages/core",
  "packages/ui",
  "packages/auth",
  "packages/catalog",
  "packages/orders",
  "packages/create-takontuku",
];

const DIR_BY_PACKAGE_NAME: Record<string, string> = {
  "@takontuku/core": "packages/core",
  "@takontuku/ui": "packages/ui",
  "@takontuku/auth": "packages/auth",
  "@takontuku/config": "configs",
  "@takontuku/catalog": "packages/catalog",
  "@takontuku/orders": "packages/orders",
};

function sh(command: string, args: string[], cwd: string): void {
  console.log(`+ ${command} ${args.join(" ")}  (in ${path.relative(ROOT, cwd) || "."})`);
  execFileSync(command, args, { cwd, stdio: "inherit" });
}

/**
 * Runs `bun publish`, treating "this version already exists on the
 * registry" as a non-fatal, expected outcome rather than a script failure.
 * This is a rehearsal tool meant to be re-run often while iterating
 * locally, and re-publishing an unchanged version is exactly what happens
 * every time nothing bumped since the last run -- bump the package's
 * version (or wipe the Verdaccio volume) to actually push new content.
 */
function publishOrSkipIfExists(args: string[], cwd: string): void {
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

type Json = Record<string, unknown>;

function readJson(filePath: string): Json {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath: string, value: Json): void {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

const NPMRC_PATH = path.join(ROOT, ".npmrc");

/**
 * bun publish's auth-token lookup for an UNSCOPED name (only
 * create-takontuku here) needs a literal default `registry=` line in
 * .npmrc, not just a --registry flag -- verified empirically in
 * scripts/publish-private.ts's sibling helper. This repo's own .npmrc
 * deliberately omits that line so ordinary third-party installs don't get
 * routed through Verdaccio, so add it back only for the duration of
 * publishing, then restore the file exactly.
 */
function withDefaultRegistryForPublish<T>(fn: () => T): T {
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
    writeFileSync(NPMRC_PATH, `${original ?? ""}registry=${REGISTRY}\n`);
    return fn();
  } finally {
    if (original === null) {
      execFileSync("rm", [NPMRC_PATH]);
    } else {
      writeFileSync(NPMRC_PATH, original);
    }
  }
}

function versionOf(packageName: string): string {
  const dir = DIR_BY_PACKAGE_NAME[packageName];
  if (!dir) throw new Error(`Don't know which directory ${packageName} lives in`);
  return readJson(path.join(ROOT, dir, "package.json")).version as string;
}

function publishPackage(dir: string): void {
  const pkgPath = path.join(ROOT, dir, "package.json");
  const original = readFileSync(pkgPath, "utf8");
  try {
    const pkg = readJson(pkgPath);
    delete pkg.private;
    for (const depField of ["dependencies", "devDependencies", "peerDependencies"]) {
      const deps = pkg[depField] as Record<string, string> | undefined;
      if (!deps) continue;
      for (const name of Object.keys(deps)) {
        if (deps[name] === "workspace:*") deps[name] = versionOf(name);
      }
    }
    writeJson(pkgPath, pkg);
    const args = ["publish", "--registry", REGISTRY, ...(DRY_RUN ? ["--dry-run"] : [])];
    publishOrSkipIfExists(args, path.join(ROOT, dir));
  } finally {
    writeFileSync(pkgPath, original);
  }
}

function main(): void {
  console.log(`Publishing every package to ${REGISTRY}${DRY_RUN ? " (dry run)" : ""}`);
  sh(
    "moon",
    ["run", "core:build", "auth:build", "catalog:build", "orders:build", "create-takontuku:build"],
    ROOT,
  );
  withDefaultRegistryForPublish(() => {
    for (const dir of PACKAGES) publishPackage(dir);
  });
}

main();
