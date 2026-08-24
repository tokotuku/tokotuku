// Shared helpers for the e2e scripts in this directory (Gate 1's run.ts,
// Gate 2's fixtures.ts, Gate 2b's upgrade.ts): publishing every publishable
// @karsa/* package to a real registry, scaffolding a client with
// create-karsa, and driving/asserting against a booted client.

import { type ChildProcess, execFileSync, spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const REGISTRY = process.env.REGISTRY_URL ?? "http://localhost:4873";
const NPMRC_PATH = path.join(ROOT, ".npmrc");

function readRepositoryRegistryToken(): string | undefined {
  if (!existsSync(NPMRC_PATH)) return undefined;
  const registry = new URL(REGISTRY);
  const prefix = `//${registry.host}${registry.pathname.replace(/\/?$/, "/")}:_authToken=`;
  return readFileSync(NPMRC_PATH, "utf8")
    .split("\n")
    .find((line) => line.startsWith(prefix))
    ?.slice(prefix.length)
    .trim();
}
/**
 * Auth token for REGISTRY, needed now that private module packages require
 * authentication just to read, not only to
 * publish (tools/verdaccio/config.yaml). CI's Verdaccio service container
 * runs stock, unauthenticated-read defaults (no custom config mounted), so
 * this stays unset there and every .npmrc write below just omits the auth
 * line -- only a local run against the real locked-down registry needs it.
 * Get one with `npm adduser --registry http://localhost:4873` and export
 * the token `npm adduser` prints, or copy the `_authToken` line already in
 * this repo's own gitignored .npmrc.
 */
export const REGISTRY_AUTH_TOKEN = process.env.REGISTRY_AUTH_TOKEN ?? readRepositoryRegistryToken();

export type Json = Record<string, unknown>;

export class AssertionError extends Error {}

export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new AssertionError(message);
}

export function sh(command: string, args: string[], cwd: string): void {
  console.log(`+ ${command} ${args.join(" ")}  (in ${path.relative(ROOT, cwd) || "."})`);
  execFileSync(command, args, { cwd, stdio: "inherit" });
}

export function resolveNodeBinary(): string {
  const configured = process.env.KARSA_NODE_BINARY;
  const candidates = configured
    ? [configured]
    : [process.env.npm_node_execpath, "node"].filter((candidate): candidate is string =>
        Boolean(candidate),
      );
  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore" });
      return candidate;
    } catch {
      // Try the next installed Node executable.
    }
  }
  throw new Error("Wrangler boot checks need Node; set KARSA_NODE_BINARY to a Node executable.");
}

export function spawnWranglerDev(clientDir: string, port: number): ChildProcess {
  const wranglerCli = path.join(clientDir, "node_modules", "wrangler", "wrangler-dist", "cli.js");
  assert(existsSync(wranglerCli), `wrangler CLI is missing from the packed client: ${wranglerCli}`);
  return spawn(
    resolveNodeBinary(),
    [
      wranglerCli,
      "dev",
      "--local",
      "--ip",
      "127.0.0.1",
      "--port",
      String(port),
      "--show-interactive-dev-session=false",
    ],
    { cwd: clientDir, stdio: "inherit", detached: true },
  );
}

export function terminateProcessGroup(child: ChildProcess): void {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ESRCH")) throw error;
  }
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

/**
 * A packed install must let Tailwind v4 see utility classes inside the
 * @karsa packages themselves. Checking the built CSS catches a missing
 * `@source` declaration that a workspace symlink can hide.
 */
export function assertPackedTailwindUtilities(clientDir: string): void {
  const distDir = path.join(clientDir, "dist");
  const cssFiles: string[] = [];
  const visit = (directory: string): void => {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory)) {
      const filePath = path.join(directory, entry);
      if (statSync(filePath).isDirectory()) visit(filePath);
      else if (filePath.endsWith(".css")) cssFiles.push(filePath);
    }
  };
  visit(distDir);
  const css = cssFiles.map((filePath) => readFileSync(filePath, "utf8")).join("\n");
  assert(
    /\.rounded-karsa-md(?:[,{])/.test(css),
    "packed build is missing theme utility rounded-karsa-md",
  );
  assert(
    /\.text-foreground(?:[,{])/.test(css),
    "packed build is missing theme utility text-foreground",
  );
}

export function assertAgentSetup(clientDir: string): void {
  for (const fileName of ["AGENTS.md", "CLAUDE.md", "README.md"]) {
    assert(existsSync(path.join(clientDir, fileName)), `scaffold is missing ${fileName}`);
  }

  const skills = ["karsa-content", "karsa-data", "karsa-modules", "karsa-site-builder", "karsa-ui"];
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

// Keep the publish order dependency-friendly so a real registry can resolve
// each tarball's internal Karsa references as soon as it is published.
const PUBLISHABLE_PACKAGES = [
  "configs",
  "packages/theme",
  "packages/ui",
  "packages/charts",
  "packages/core",
  "packages/auth",
  "packages/jarene",
  "packages/catalog",
  "packages/orders",
  "packages/booking",
  "packages/content",
  "packages/create-karsa",
];

/**
 * `bun publish`'s auth-token lookup for an UNSCOPED package name (only
 * create-karsa, of PUBLISHABLE_PACKAGES) needs an actual default
 * `registry=` line in .npmrc to anchor to -- verified empirically that
 * neither `--registry` on the command line nor `npm_config_registry` /
 * `npm_config__authtoken` env vars are enough on their own. Scoped
 * @karsa/* packages don't have this problem: `@karsa:registry=`
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
 * Registries refuse `private: true`, and the isolated e2e version must be
 * used for every internal Karsa dependency instead of the release range
 * checked into the workspace. Stamps both in memory, publishes, and restores
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
        if (name.startsWith("@karsa/")) deps[name] = version;
      }
    }
    writeJson(pkgPath, pkg);
    publishWithRetry(path.join(ROOT, dir));
  } finally {
    writeFileSync(pkgPath, original);
  }
}

/**
 * Publishes every publishable @karsa/* package at a fresh, unique
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
  for (const directory of [
    "packages/core",
    "packages/auth",
    "packages/catalog",
    "packages/orders",
    "packages/booking",
    "packages/content",
    "packages/jarene",
    "packages/create-karsa",
  ]) {
    sh("bun", ["run", "build"], path.join(ROOT, directory));
  }

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
 * Scaffolds a client with create-karsa and points its @karsa/* deps
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
  // `--no-install` stops create-karsa installing and migrating on its own,
  // which would run before the .npmrc written below exists and so resolve
  // @karsa/* from public npm (or fail) instead of this run's registry --
  // the gates drive those steps themselves, at the pinned e2e version.
  sh(
    process.execPath,
    [path.join(ROOT, "packages/create-karsa/dist/bin.js"), clientName, "--yes", "--no-install"],
    scratchParent,
  );
  const npmrcLines = [`@karsa:registry=${REGISTRY}`, `registry=${REGISTRY}`];
  if (REGISTRY_AUTH_TOKEN) {
    npmrcLines.push(`//${new URL(REGISTRY).host}/:_authToken=${REGISTRY_AUTH_TOKEN}`);
  }
  writeFileSync(path.join(clientDir, ".npmrc"), `${npmrcLines.join("\n")}\n`);

  if (version !== null) {
    const clientPkgPath = path.join(clientDir, "package.json");
    const clientPkg = readJson(clientPkgPath);
    const deps = clientPkg.dependencies as Record<string, string>;
    for (const name of Object.keys(deps)) {
      if (name.startsWith("@karsa/")) deps[name] = version;
    }
    writeJson(clientPkgPath, clientPkg);
  }

  return clientDir;
}

/**
 * Removes @karsa/orders from an already-installed scaffolded client via
 * the real `karsa remove` command, rather than hand-editing files --
 * this is what actually proves the CLI's rewriter works against a client
 * `create-karsa` produced for real, not just against fixtures. Must run
 * after `installClient`: `bunx karsa` doesn't resolve before that.
 * `--no-install` is mandatory, not optional -- a bare `bun remove` here
 * would still work, but a subsequent `karsa add orders` in the same
 * gate would run a bare `bun add` that resolves "latest" from the registry
 * and silently overwrites the pinned e2e version `scaffoldClient` wrote
 * into package.json. Callers that need node_modules actually pruned
 * afterward should call `installClient` again themselves.
 */
export function removeOrdersModule(clientDir: string): void {
  sh("bunx", ["karsa", "remove", "orders", "--no-install"], clientDir);
}

/**
 * Adds a @karsa/* module this scratch client has never had before --
 * the default scaffold is public-only (auth + core + ui), so catalog and
 * orders always start out genuinely absent, not just removed.
 *
 * `karsa add --no-install` alone can't do this: it only writes
 * package.json, and the CLI's own inspection step needs the package
 * already resolvable in node_modules to read its export shape and
 * `requires`. So this fetches the package for real first -- with the same
 * `--registry`/`--force` flags `installClient` uses, and for the same
 * reason: the client's own `.npmrc` already routes the scope correctly,
 * but Bun's registry-manifest cache would otherwise serve a stale "latest"
 * left over from an earlier e2e run against this same registry -- then
 * runs `karsa add --no-install --no-sync`, which at that point is a
 * pure config/middleware wiring step against an already-correct
 * package.json and already-populated node_modules. For a module like
 * orders, whose own package.json depends on catalog, that dependency rides
 * along transitively from the same `bun add`, so a caller adding orders
 * fresh never needs to add catalog first.
 */
function addFreshModule(clientDir: string, moduleName: string): void {
  // Company is the `--yes` scaffold default and intentionally omits currency.
  // Commerce modules fail early without it, so this gate explicitly performs
  // the same small configuration step a real consumer must perform before
  // adding catalog/orders.
  if (moduleName === "catalog" || moduleName === "orders") {
    const configPath = path.join(clientDir, "astro.config.mjs");
    const source = readFileSync(configPath, "utf8");
    if (!/\bcurrency\s*:/.test(source)) {
      const localeLine = source.match(/^\s*locale:\s*"[^"]+",\s*$/m)?.[0];
      assert(localeLine !== undefined, "scaffold brand locale is missing before adding commerce");
      writeFileSync(
        configPath,
        source.replace(localeLine, `${localeLine}\n        currency: "IDR",`),
      );
    }
  }
  sh("bun", ["add", `@karsa/${moduleName}`, "--registry", REGISTRY, "--force"], clientDir);
  sh("bunx", ["karsa", "add", moduleName, "--no-install", "--no-sync"], clientDir);
}

/** Adds @karsa/catalog for the first time. See addFreshModule. */
export function addCatalogModule(clientDir: string): void {
  addFreshModule(clientDir, "catalog");
}

/**
 * Adds @karsa/orders for the first time, pulling in catalog
 * transitively (orders' own package.json depends on it). See
 * addFreshModule.
 */
export function addOrdersModule(clientDir: string): void {
  addFreshModule(clientDir, "orders");
}

/**
 * Pins an already-added @karsa/* dependency to the literal "latest"
 * specifier, matching the rest of a client scaffolded with
 * `scaffoldClient`'s `version: null` -- needed because the raw `bun add`
 * inside `addFreshModule` writes a resolved version range instead, and
 * propagation.ts's whole premise depends on every @karsa/* dependency
 * being pinned to "latest" so `bun update` has something to re-resolve.
 * Re-installs afterward so node_modules/bun.lock reconcile with the
 * rewritten manifest.
 */
export function pinModuleToLatest(clientDir: string, moduleName: string): void {
  const pkgPath = path.join(clientDir, "package.json");
  const pkg = readJson(pkgPath);
  const deps = pkg.dependencies as Record<string, string>;
  deps[`@karsa/${moduleName}`] = "latest";
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
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      await fetchWithTimeout(url, Math.min(1_000, deadline - Date.now()));
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  const reason = lastError instanceof Error ? ` (${lastError.message})` : "";
  throw new Error(`Server at ${url} did not respond within ${timeoutMs}ms${reason}`);
}

export async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
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
