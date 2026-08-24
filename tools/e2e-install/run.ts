#!/usr/bin/env node
// Gate 1 from the migration plan ("tarball install"): publishes every
// publishable @karsa/* package to a real registry, scaffolds a client
// with create-karsa in a scratch directory OUTSIDE this repo, and runs
// the exact flow a real client would: bun install -> karsa skills install ->
// karsa db sync -> wrangler d1 migrations apply --local -> astro build
// -> a wrangler dev boot check.
//
// workspace:* symlinks hide broken exports maps, missing "files" entries,
// missing peerDependencies, and node_modules module resolution failures --
// all of which only surface once packages are actually installed from
// tarballs instead of symlinked. This script exists to catch that class of
// bug in CI instead of relying on someone re-running the steps by hand.
//
// Prerequisite: a registry reachable at REGISTRY_URL (defaults to Verdaccio
// on http://localhost:4873). Start one locally with
// `docker compose -f tools/verdaccio/compose.yaml up -d verdaccio`.

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  assertAgentSetup,
  assertPackedTailwindUtilities,
  fetchWithTimeout,
  installClient,
  publishAll,
  scaffoldClient,
  sh,
  spawnWranglerDev,
  terminateProcessGroup,
  waitForServer,
} from "./shared.ts";

const BOOT_CHECK_PORT = 8799;

// Keep Wrangler on Node because some Bun versions leave its outer dev proxy
// waiting even after the inner worker reports ready.
/** Boots the built worker with Wrangler and confirms it serves a request, then tears it down -- proof the tarball-installed package graph doesn't just build, it runs. */
async function bootCheck(clientDir: string): Promise<void> {
  const child = spawnWranglerDev(clientDir, BOOT_CHECK_PORT);

  try {
    await waitForServer(`http://127.0.0.1:${BOOT_CHECK_PORT}/setup`, 30_000);
    const response = await fetchWithTimeout(`http://127.0.0.1:${BOOT_CHECK_PORT}/setup`, 5_000);
    if (!response.ok) {
      throw new Error(`GET /setup returned ${response.status}`);
    }
    console.log(`Boot check passed: GET /setup -> ${response.status}`);
  } finally {
    terminateProcessGroup(child);
  }
}

async function main(): Promise<void> {
  const version = publishAll();

  const scratchParent = mkdtempSync(path.join(tmpdir(), "karsa-e2e-"));
  const clientDir = scaffoldClient(scratchParent, "e2e-client", version);
  console.log(`Scaffolded client at ${clientDir}`);

  installClient(clientDir);
  sh("bunx", ["karsa", "skills", "install"], clientDir);
  assertAgentSetup(clientDir);
  sh("bunx", ["karsa", "db", "sync"], clientDir);
  sh("bunx", ["wrangler", "d1", "migrations", "apply", "DB", "--local"], clientDir);
  sh("bun", ["run", "build"], clientDir);
  assertPackedTailwindUtilities(clientDir);
  await bootCheck(clientDir);

  console.log("");
  console.log(`Gate 1 passed. Scratch client left at ${clientDir} for inspection.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
