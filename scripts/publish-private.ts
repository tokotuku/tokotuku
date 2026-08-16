#!/usr/bin/env bun
/**
 * Publishes @takontuku/catalog and @takontuku/orders -- the two packages
 * that never go to public npm -- to the private registry. Run manually
 * from a machine with publish credentials there; this deliberately has no
 * CI counterpart (see .github/workflows/ci.yml, which only ever publishes
 * the public packages) so a release never depends on that registry's
 * uptime.
 *
 * Mirrors the publish pattern in tools/e2e-install/shared.ts
 * (publishPackage/publishWithRetry): stamp `private` off and workspace:*
 * deps to real versions in memory, publish, restore the file from disk
 * in a `finally` regardless of outcome. Differs from that e2e version in
 * two ways: the version published is the real one left by `changeset
 * version` (not a throwaway 0.0.0-e2e.<timestamp>), and each workspace:*
 * dependency resolves to whatever version is currently checked into
 * *that* package's own package.json -- core/ui/config are public
 * packages that may not share catalog/orders' version number, so there
 * is no single shared version to substitute everywhere.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DRY_RUN = process.argv.includes("--dry-run");

/**
 * No tunnel hostname exists yet (tools/verdaccio's cloudflared service is
 * wired up but still waiting on a Cloudflare Tunnel token -- see that
 * directory's README). Defaulting to localhost is honest about that: it
 * only works from this machine today. Once the tunnel is live, export
 * PRIVATE_REGISTRY_URL=https://npm.<your-domain> instead of relying on
 * this default.
 */
const REGISTRY = process.env.PRIVATE_REGISTRY_URL ?? "http://localhost:4873";

const PRIVATE_PACKAGES = ["packages/catalog", "packages/orders"];

// Publish order matters here too: orders' workspace:* on catalog must
// resolve to an already-published version.
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

type Json = Record<string, unknown>;

function readJson(filePath: string): Json {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath: string, value: Json): void {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function versionOf(packageName: string): string {
  const dir = DIR_BY_PACKAGE_NAME[packageName];
  if (!dir) throw new Error(`Don't know which directory ${packageName} lives in`);
  const pkg = readJson(path.join(ROOT, dir, "package.json"));
  return pkg.version as string;
}

function publishPrivatePackage(dir: string): void {
  const pkgPath = path.join(ROOT, dir, "package.json");
  const original = readFileSync(pkgPath, "utf8");
  try {
    const pkg = readJson(pkgPath);
    const version = pkg.version as string;
    if (version === "0.0.0") {
      throw new Error(
        `${dir}/package.json is still at 0.0.0 -- run \`bun run version\` (changeset version) first.`,
      );
    }
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
    sh("bun", args, path.join(ROOT, dir));
    console.log(`${DRY_RUN ? "[dry-run] " : ""}Published ${pkg.name}@${version} to ${REGISTRY}`);
  } finally {
    writeFileSync(pkgPath, original);
  }
}

function main(): void {
  console.log(`Publishing private modules to ${REGISTRY}${DRY_RUN ? " (dry run)" : ""}`);
  sh("moon", ["run", "catalog:build", "orders:build"], ROOT);
  for (const dir of PRIVATE_PACKAGES) {
    publishPrivatePackage(dir);
  }
}

main();
