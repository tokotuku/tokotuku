#!/usr/bin/env node
// Gate 5 (verification slice) from the migration plan: proves the actual
// business reason this migration exists -- "framework harus jadi package
// supaya perbaikan bisa didorong lewat bun update." Publishes a baseline,
// scaffolds a client the way create-tokotuku actually leaves it
// (dependencies pinned to the literal "latest" specifier, not a fixed
// version -- see scaffoldClient's `version: null`), makes a real code
// change, republishes, and asserts `bun update` in that SAME client picks
// up the change and the client still builds and serves it.
//
// This deliberately stops short of the plan's full Gate 5, which also
// calls for wiring `changeset version` + publish into CI (Verdaccio on
// `dev`, real npm on `main`). That's a release-engineering decision with
// real external consequences -- claiming the @tokotuku scope on the public
// registry, npm publish credentials in CI -- not something to set up
// unilaterally. This script only proves the update mechanism itself works,
// entirely against the local registry.
//
// Prerequisite: a registry reachable at REGISTRY_URL (defaults to Verdaccio
// on http://localhost:4873). Start one locally with `moon run verdaccio:up`.

import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  AssertionError,
  assert,
  installClient,
  publishAll,
  ROOT,
  scaffoldClient,
  setupAndLogIn,
  sh,
  updateClient,
  waitForServer,
} from "./shared.ts";

const BOOT_CHECK_PORT = 8796;
const ADMIN = {
  name: "Gate5 Admin",
  email: "admin@gate5-propagation.local",
  password: "gate5proppass123",
};

const MARKER_FILE = path.join(ROOT, "packages/catalog/src/routes/products/index.astro");
// Matched against rendered text content, not raw tag markup -- Astro's
// scoped-style compiler injects a data-astro-cid-* attribute onto <h1>
// (this component has a <style> block), so the literal opening tag never
// appears as "<h1>" in the output.
const ORIGINAL_HEADING = "Useful by nature.";
const PATCHED_HEADING = "Useful by nature. (patched)";

async function fetchProductsHeading(origin: string): Promise<string> {
  const html = await (await fetch(`${origin}/products`)).text();
  return html.includes(PATCHED_HEADING)
    ? "patched"
    : html.includes(ORIGINAL_HEADING)
      ? "original"
      : "unknown";
}

/** /products needs no auth, but every route redirects to /setup until setup completes, so this always runs it -- harmless and idempotent on the second boot, since D1 --local state (including the admin account) persists across separate `wrangler dev` invocations in the same client dir. */
async function bootAndCheck(clientDir: string): Promise<string> {
  const origin = `http://localhost:${BOOT_CHECK_PORT}`;
  const child = spawn("bunx", ["wrangler", "dev", "--port", String(BOOT_CHECK_PORT)], {
    cwd: clientDir,
    stdio: "inherit",
    detached: true,
  });

  try {
    await waitForServer(`${origin}/setup`, 30_000);
    await setupAndLogIn(origin, ADMIN);
    return await fetchProductsHeading(origin);
  } finally {
    if (child.pid) process.kill(-child.pid, "SIGTERM");
  }
}

async function main(): Promise<void> {
  publishAll();

  const scratchParent = mkdtempSync(path.join(tmpdir(), "tokotuku-e2e-propagation-"));
  const clientDir = scaffoldClient(scratchParent, "gate5-client", null);
  console.log(
    `Scaffolded client (dependencies pinned to "latest", like a real client) at ${clientDir}`,
  );

  installClient(clientDir);
  sh("bunx", ["tokotuku", "db", "sync"], clientDir);
  sh("bunx", ["wrangler", "d1", "migrations", "apply", "DB", "--local"], clientDir);
  sh("bun", ["run", "build"], clientDir);

  const before = await bootAndCheck(clientDir);
  assert(
    before === "original",
    `expected the baseline storefront heading before any patch, got "${before}"`,
  );
  console.log("Baseline: storefront serves the unpatched heading.");

  const originalSource = readFileSync(MARKER_FILE, "utf8");
  assert(
    originalSource.includes(ORIGINAL_HEADING),
    "expected the marker heading to be present before patching",
  );
  try {
    writeFileSync(MARKER_FILE, originalSource.replace(ORIGINAL_HEADING, PATCHED_HEADING));
    console.log("Applied a trivial patch to catalog's product listing heading.");
    publishAll();
  } finally {
    writeFileSync(MARKER_FILE, originalSource);
  }

  console.log("Running `bun update` in the existing client (not a fresh install)...");
  updateClient(clientDir);
  sh("bun", ["run", "build"], clientDir);

  const after = await bootAndCheck(clientDir);
  assert(
    after === "patched",
    `expected "bun update" to pick up the patched heading, got "${after}"`,
  );
  console.log("After `bun update`: storefront serves the patched heading.");

  console.log("");
  console.log(
    `Gate 5 (update propagation) passed. Scratch client left at ${clientDir} for inspection.`,
  );
}

main().catch((error) => {
  console.error(error instanceof AssertionError ? `Gate 5 FAILED: ${error.message}` : error);
  process.exitCode = 1;
});
