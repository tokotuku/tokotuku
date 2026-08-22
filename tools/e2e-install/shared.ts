// Shared helpers for the e2e scripts in this directory (Gate 1's run.ts,
// Gate 2's fixtures.ts, Gate 2b's upgrade.ts): publishing every publishable
// @takontuku/* package to a real registry, scaffolding a client with
// create-takontuku, and driving/asserting against a booted client.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const REGISTRY = process.env.REGISTRY_URL ?? "http://localhost:4873";
/**
 * Auth token for REGISTRY, needed now that @takontuku/catalog and
 * @takontuku/orders require authentication just to read, not only to
 * publish (tools/verdaccio/config.yaml). CI's Verdaccio service container
 * runs stock, unauthenticated-read defaults (no custom config mounted), so
 * this stays unset there and every .npmrc write below just omits the auth
 * line -- only a local run against the real locked-down registry needs it.
 * Get one with `npm adduser --registry http://localhost:4873` and export
 * the token `npm adduser` prints, or copy the `_authToken` line already in
 * this repo's own gitignored .npmrc.
 */
export const REGISTRY_AUTH_TOKEN = process.env.REGISTRY_AUTH_TOKEN;

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

export function assertAgentSetup(clientDir: string): void {
  for (const fileName of ["AGENTS.md", "CLAUDE.md", "README.md"]) {
    assert(existsSync(path.join(clientDir, fileName)), `scaffold is missing ${fileName}`);
  }

  const skills = ["takontuku-data", "takontuku-modules", "takontuku-store-builder", "takontuku-ui"];
  for (const target of [".agents/skills", ".claude/skills"]) {
    for (const skill of skills) {
      const skillPath = path.join(clientDir, target, skill, "SKILL.md");
      assert(existsSync(skillPath), `installed skill is missing ${target}/${skill}/SKILL.md`);
      assert(
        readFileSync(skillPath, "utf8").includes(`name: ${skill}`),
        `${target}/${skill}/SKILL.md has the wrong skill metadata`,
      );
    }
  }
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
  "packages/booking",
  "packages/create-takontuku",
];

const NPMRC_PATH = path.join(ROOT, ".npmrc");

/**
 * `bun publish`'s auth-token lookup for an UNSCOPED package name (only
 * create-takontuku, of PUBLISHABLE_PACKAGES) needs an actual default
 * `registry=` line in .npmrc to anchor to -- verified empirically that
 * neither `--registry` on the command line nor `npm_config_registry` /
 * `npm_config__authtoken` env vars are enough on their own. Scoped
 * @takontuku/* packages don't have this problem: `@takontuku:registry=`
 * already gives bun that anchor by itself.
 *
 * The persistent repo .npmrc deliberately has no default `registry=` line
 * -- one there routes every OTHER package's `bun install` through
 * Verdaccio too, which is exactly what silently filled bun.lock with local
 * tarball URLs for ordinary third-party dependencies like astro until this
 * was caught. So this adds the line back only for the duration of
 * publishing, then restores the file exactly (or removes it, if it didn't
 * exist before), regardless of outcome.
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
    [
      "run",
      "core:build",
      "auth:build",
      "catalog:build",
      "orders:build",
      "booking:build",
      "create-takontuku:build",
    ],
    ROOT,
  );

  const version = `0.0.0-e2e.${Date.now()}`;
  console.log(`Publishing at ${version} to ${REGISTRY}`);
  withDefaultRegistryForPublish(() => {
    for (const dir of PUBLISHABLE_PACKAGES) {
      publishPackage(dir, version);
    }
  });
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
  // Both flags are mandatory, for different reasons. `--yes` suppresses the
  // interactive wizard: these gates inherit this process's stdin, so run from
  // a terminal they would otherwise sit waiting on a prompt forever.
  // `--no-install` stops create-takontuku installing and migrating on its own,
  // which would run before the .npmrc written below exists and so resolve
  // @takontuku/* from public npm (or fail) instead of this run's registry --
  // the gates drive those steps themselves, at the pinned e2e version.
  sh(
    "node",
    [path.join(ROOT, "packages/create-takontuku/dist/bin.js"), clientName, "--yes", "--no-install"],
    scratchParent,
  );
  const npmrcLines = [`@takontuku:registry=${REGISTRY}`, `registry=${REGISTRY}`];
  if (REGISTRY_AUTH_TOKEN) {
    npmrcLines.push(`//${new URL(REGISTRY).host}/:_authToken=${REGISTRY_AUTH_TOKEN}`);
  }
  writeFileSync(path.join(clientDir, ".npmrc"), `${npmrcLines.join("\n")}\n`);

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

/**
 * Removes @takontuku/orders from an already-installed scaffolded client via
 * the real `takontuku remove` command, rather than hand-editing files --
 * this is what actually proves the CLI's rewriter works against a client
 * `create-takontuku` produced for real, not just against fixtures. Must run
 * after `installClient`: `bunx takontuku` doesn't resolve before that.
 * `--no-install` is mandatory, not optional -- a bare `bun remove` here
 * would still work, but a subsequent `takontuku add orders` in the same
 * gate would run a bare `bun add` that resolves "latest" from the registry
 * and silently overwrites the pinned e2e version `scaffoldClient` wrote
 * into package.json. Callers that need node_modules actually pruned
 * afterward should call `installClient` again themselves.
 */
export function removeOrdersModule(clientDir: string): void {
  sh("bunx", ["takontuku", "remove", "orders", "--no-install"], clientDir);
}

/**
 * Adds a @takontuku/* module this scratch client has never had before --
 * the default scaffold is public-only (auth + core + ui), so catalog and
 * orders always start out genuinely absent, not just removed.
 *
 * `takontuku add --no-install` alone can't do this: it only writes
 * package.json, and the CLI's own inspection step needs the package
 * already resolvable in node_modules to read its export shape and
 * `requires`. So this fetches the package for real first -- with the same
 * `--registry`/`--force` flags `installClient` uses, and for the same
 * reason: the client's own `.npmrc` already routes the scope correctly,
 * but Bun's registry-manifest cache would otherwise serve a stale "latest"
 * left over from an earlier e2e run against this same registry -- then
 * runs `takontuku add --no-install --no-sync`, which at that point is a
 * pure config/middleware wiring step against an already-correct
 * package.json and already-populated node_modules. For a module like
 * orders, whose own package.json depends on catalog, that dependency rides
 * along transitively from the same `bun add`, so a caller adding orders
 * fresh never needs to add catalog first.
 */
function addFreshModule(clientDir: string, moduleName: string): void {
  sh("bun", ["add", `@takontuku/${moduleName}`, "--registry", REGISTRY, "--force"], clientDir);
  sh("bunx", ["takontuku", "add", moduleName, "--no-install", "--no-sync"], clientDir);
}

/** Adds @takontuku/catalog for the first time. See addFreshModule. */
export function addCatalogModule(clientDir: string): void {
  addFreshModule(clientDir, "catalog");
}

/**
 * Adds @takontuku/orders for the first time, pulling in catalog
 * transitively (orders' own package.json depends on it). See
 * addFreshModule.
 */
export function addOrdersModule(clientDir: string): void {
  addFreshModule(clientDir, "orders");
}

/**
 * Pins an already-added @takontuku/* dependency to the literal "latest"
 * specifier, matching the rest of a client scaffolded with
 * `scaffoldClient`'s `version: null` -- needed because the raw `bun add`
 * inside `addFreshModule` writes a resolved version range instead, and
 * propagation.ts's whole premise depends on every @takontuku/* dependency
 * being pinned to "latest" so `bun update` has something to re-resolve.
 * Re-installs afterward so node_modules/bun.lock reconcile with the
 * rewritten manifest.
 */
export function pinModuleToLatest(clientDir: string, moduleName: string): void {
  const pkgPath = path.join(clientDir, "package.json");
  const pkg = readJson(pkgPath);
  const deps = pkg.dependencies as Record<string, string>;
  deps[`@takontuku/${moduleName}`] = "latest";
  writeJson(pkgPath, pkg);
  installClient(clientDir);
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
