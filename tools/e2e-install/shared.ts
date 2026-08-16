// Shared helpers for the e2e scripts in this directory (Gate 1's run.ts,
// Gate 2's fixtures.ts, Gate 2b's upgrade.ts): publishing every publishable
// @takontuku/* package to a real registry, scaffolding a client with
// create-takontuku, and driving/asserting against a booted client.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const REGISTRY = process.env.REGISTRY_URL ?? "http://localhost:4873";

export type Json = Record<string, unknown>;

export class AssertionError extends Error {}

export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new AssertionError(message);
}

export function sh(command: string, args: string[], cwd: string): void {
  console.log(`+ ${command} ${args.join(" ")}  (in ${path.relative(ROOT, cwd) || "."})`);
  execFileSync(command, args, { cwd, stdio: "inherit" });
}

export function readJson(filePath: string): Json {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function writeJson(filePath: string, value: Json): void {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Installs a scratch client from the registry used by this E2E run.
 *
 * Scratch clients live outside the workspace, so they do not inherit the
 * repository's `.npmrc`. Bun can also fall back to its default registry when
 * a project only contains a scope mapping, which makes an e2e prerelease
 * version look missing even though it was just published to Verdaccio. Bun
 * also caches registry manifests by package and registry; every gate publishes
 * a fresh version, so `--force` is required to refresh that manifest instead
 * of resolving against the previous gate's version list.
 */
export function installClient(clientDir: string): void {
  sh("bun", ["install", "--registry", REGISTRY, "--force"], clientDir);
}

/** Updates an existing scratch client from the registry used by this E2E run. */
export function updateClient(clientDir: string): void {
  sh("bun", ["update", "--registry", REGISTRY, "--force"], clientDir);
}

// Publish order matters: `bun publish` requires every workspace:*
// reference (including in devDependencies) to resolve to an already-
// published version, so each entry here must come after everything it
// depends on.
const PUBLISHABLE_PACKAGES = [
  "configs",
  "packages/core",
  "packages/ui",
  "packages/auth",
  "packages/catalog",
  "packages/orders",
  "packages/create-takontuku",
];

/**
 * `bun publish` occasionally fails client-side with "missing authentication"
 * against a registry the same .npmrc just authenticated a prior publish to
 * in this same loop -- a known class of Bun registry-auth resolution
 * flakiness in CI environments (see oven-sh/bun#24124), not a real
 * credentials problem. The failure happens before any network request (no
 * tarball is ever uploaded), so retrying is safe: there is nothing on the
 * registry for a retry to collide with.
 */
function publishWithRetry(cwd: string, attempts = 3): void {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      sh("bun", ["publish", "--registry", REGISTRY], cwd);
      return;
    } catch (error) {
      if (attempt === attempts) throw error;
      console.warn(
        `bun publish failed in ${path.relative(ROOT, cwd)}, retrying (${attempt}/${attempts})...`,
      );
      execFileSync("sleep", ["2"]);
    }
  }
}

/**
 * Registries refuse `private: true` and require every workspace:*
 * dependency to resolve to a real version -- neither is true for these
 * packages as checked in. Stamps both in memory, publishes, and restores
 * the file from disk afterward regardless of outcome.
 */
function publishPackage(dir: string, version: string): void {
  const pkgPath = path.join(ROOT, dir, "package.json");
  const original = readFileSync(pkgPath, "utf8");
  try {
    const pkg = readJson(pkgPath);
    delete pkg.private;
    pkg.version = version;
    for (const depField of ["dependencies", "devDependencies", "peerDependencies"]) {
      const deps = pkg[depField] as Record<string, string> | undefined;
      if (!deps) continue;
      for (const name of Object.keys(deps)) {
        if (deps[name] === "workspace:*") deps[name] = version;
      }
    }
    writeJson(pkgPath, pkg);
    publishWithRetry(path.join(ROOT, dir));
  } finally {
    writeFileSync(pkgPath, original);
  }
}

/**
 * Publishes every publishable @takontuku/* package at a fresh, unique
 * version and returns it. Rebuilds dist/ first so a stale or missing build
 * doesn't silently get published.
 *
 * The version is unique per call so this is safe to invoke more than once
 * in the same process, or re-run against a registry that already has
 * earlier runs' packages: registries reject re-publishing an existing
 * version, and package managers cache extracted tarballs by
 * name+version+registry, so reusing one serves stale content even after a
 * fresh publish.
 */
export function publishAll(): string {
  sh(
    "moon",
    ["run", "core:build", "auth:build", "catalog:build", "orders:build", "create-takontuku:build"],
    ROOT,
  );

  const version = `0.0.0-e2e.${Date.now()}`;
  console.log(`Publishing at ${version} to ${REGISTRY}`);
  for (const dir of PUBLISHABLE_PACKAGES) {
    publishPackage(dir, version);
  }
  return version;
}

/**
 * Scaffolds a client with create-takontuku and points its @takontuku/* deps
 * at `version` instead of the template's "latest". Pass `null` to leave the
 * template's literal "latest" specifiers untouched -- the state a real
 * client's package.json is actually in, needed for testing that `bun
 * update` picks up newly published versions the way a real client's would.
 */
export function scaffoldClient(
  scratchParent: string,
  clientName: string,
  version: string | null,
): string {
  const clientDir = path.join(scratchParent, clientName);
  sh("node", [path.join(ROOT, "packages/create-takontuku/dist/bin.js"), clientName], scratchParent);
  writeFileSync(
    path.join(clientDir, ".npmrc"),
    `${[`@takontuku:registry=${REGISTRY}`, `registry=${REGISTRY}`].join("\n")}\n`,
  );

  if (version !== null) {
    const clientPkgPath = path.join(clientDir, "package.json");
    const clientPkg = readJson(clientPkgPath);
    const deps = clientPkg.dependencies as Record<string, string>;
    for (const name of Object.keys(deps)) {
      if (name.startsWith("@takontuku/")) deps[name] = version;
    }
    writeJson(clientPkgPath, clientPkg);
  }

  return clientDir;
}

/** Drops @takontuku/orders from a scaffolded client -- the exact edits astro.config.mjs's own "Remove a module here" comment documents. Returns the pre-edit file contents so a caller that wants to add the module back later doesn't have to reconstruct them. */
export function dropOrdersModule(clientDir: string): {
  configPath: string;
  pkgPath: string;
  originalConfig: string;
  originalPkg: string;
} {
  const configPath = path.join(clientDir, "astro.config.mjs");
  const originalConfig = readFileSync(configPath, "utf8");
  let config = originalConfig.replace('import { orders } from "@takontuku/orders";\n', "");
  config = config.replace(/,\s*orders\(\)/, "");
  assert(
    config !== originalConfig,
    "expected astro.config.mjs to reference orders() before editing",
  );
  writeFileSync(configPath, config);

  const pkgPath = path.join(clientDir, "package.json");
  const originalPkg = readFileSync(pkgPath, "utf8");
  const pkg = readJson(pkgPath);
  const deps = pkg.dependencies as Record<string, string>;
  assert("@takontuku/orders" in deps, "expected @takontuku/orders in the scaffolded dependencies");
  delete deps["@takontuku/orders"];
  writeJson(pkgPath, pkg);

  return { configPath, pkgPath, originalConfig, originalPkg };
}

interface D1QueryResult {
  results: Record<string, unknown>[];
}

export function queryD1(clientDir: string, sql: string): Record<string, unknown>[] {
  const output = execFileSync(
    "bunx",
    ["wrangler", "d1", "execute", "DB", "--local", "--json", "--command", sql],
    { cwd: clientDir, encoding: "utf8" },
  );
  const [result] = JSON.parse(output) as D1QueryResult[];
  assert(result !== undefined, "expected at least one result set from wrangler d1 execute");
  return result.results;
}

export function queryTableNames(clientDir: string): string[] {
  return queryD1(clientDir, "SELECT name FROM sqlite_master WHERE type = 'table'").map(
    (row) => row.name as string,
  );
}

export async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`Server at ${url} did not respond within ${timeoutMs}ms`);
}

export interface AdminCredentials {
  name: string;
  email: string;
  password: string;
}

/** Completes first-run setup and logs in, returning the session cookie. Astro's origin check rejects a cross-site-looking POST, so this needs an Origin/Referer matching the target -- a real browser sends these automatically. */
export async function setupAndLogIn(
  origin: string,
  credentials: AdminCredentials,
): Promise<string> {
  const setupResponse = await fetch(`${origin}/setup`, {
    method: "POST",
    redirect: "manual",
    headers: {
      Origin: origin,
      Referer: `${origin}/setup`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      name: credentials.name,
      email: credentials.email,
      password: credentials.password,
      confirmPassword: credentials.password,
    }),
  });
  assert(
    setupResponse.status === 303 || setupResponse.status === 302,
    `expected /setup POST to redirect, got ${setupResponse.status}`,
  );

  const loginResponse = await fetch(`${origin}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ email: credentials.email, password: credentials.password }),
  });
  assert(loginResponse.ok, `expected sign-in to succeed, got ${loginResponse.status}`);
  const setCookie = loginResponse.headers.get("set-cookie");
  assert(setCookie !== null, "expected sign-in response to set a session cookie");
  return setCookie.split(";")[0] as string;
}
