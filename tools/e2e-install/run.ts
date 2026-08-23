#!/usr/bin/env node
// Gate 1 from the migration plan ("tarball install"): publishes every
// publishable @takontuku/* package to a real registry, scaffolds a client
// with create-takontuku in a scratch directory OUTSIDE this repo, and runs
// the exact flow a real client would: bun install -> takontuku skills install ->
// takontuku db sync -> wrangler d1 migrations apply --local -> astro build
// -> a wrangler dev boot check.
//
// workspace:* symlinks hide broken exports maps, missing "files" entries,
// missing peerDependencies, and node_modules module resolution failures --
// all of which only surface once packages are actually installed from
// tarballs instead of symlinked. This script exists to catch that class of
// bug in CI instead of relying on someone re-running the steps by hand.
//
// Prerequisite: a registry reachable at REGISTRY_URL (defaults to Verdaccio
// on http://localhost:4873). Start one locally with `moon run verdaccio:up`.

import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
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
  waitForServer,
} from "./shared.ts";

const BOOT_CHECK_PORT = 8799;

function resolveNodeBinary(): string {
  const configured = process.env.TAKONTUKU_NODE_BINARY;
  const candidate = configured ?? process.env.npm_node_execpath ?? "node";
  try {
    execFileSync(candidate, ["--version"], { stdio: "ignore" });
  } catch {
    throw new Error(
      `Node is required to run the Wrangler boot check; set TAKONTUKU_NODE_BINARY to a Node executable (tried ${candidate})`,
    );
  }
  return candidate;
}

// Keep Wrangler on Node here. Running its CLI through bunx leaves the outer
// dev proxy waiting forever on some Bun runtimes even though the inner worker
// is healthy and reachable.
/** Boots the built worker with Wrangler's Node CLI and confirms it serves a request, then tears it down -- proof the tarball-installed package graph doesn't just build, it runs. */
async function bootCheck(clientDir: string): Promise<void> {
  const wranglerCli = path.join(clientDir, "node_modules", "wrangler", "wrangler-dist", "cli.js");
  if (!existsSync(wranglerCli)) {
    throw new Error(`wrangler CLI is missing from the packed client: ${wranglerCli}`);
  }

  const child = spawn(
    resolveNodeBinary(),
    [
      wranglerCli,
      "dev",
      "--local",
      "--ip",
      "127.0.0.1",
      "--port",
      String(BOOT_CHECK_PORT),
      "--show-interactive-dev-session=false",
    ],
    {
      cwd: clientDir,
      stdio: "inherit",
      detached: true,
    },
  );

  try {
    await waitForServer(`http://127.0.0.1:${BOOT_CHECK_PORT}/setup`, 30_000);
    const response = await fetchWithTimeout(`http://127.0.0.1:${BOOT_CHECK_PORT}/setup`, 5_000);
    if (!response.ok) {
      throw new Error(`GET /setup returned ${response.status}`);
    }
    console.log(`Boot check passed: GET /setup -> ${response.status}`);
  } finally {
    if (child.pid) process.kill(-child.pid, "SIGTERM");
  }
}

async function main(): Promise<void> {
  const version = publishAll();

  const scratchParent = mkdtempSync(path.join(tmpdir(), "takontuku-e2e-"));
  const clientDir = scaffoldClient(scratchParent, "e2e-client", version);
  console.log(`Scaffolded client at ${clientDir}`);

  installClient(clientDir);
  sh("bunx", ["takontuku", "skills", "install"], clientDir);
  assertAgentSetup(clientDir);
  sh("bunx", ["takontuku", "db", "sync"], clientDir);
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
