#!/usr/bin/env node
// New gate: proves `takontuku add`/`takontuku remove` produce output real
// tooling accepts, not just what this repo's own unit tests expect. No unit
// test can prove the rewritten astro.config.mjs survives Biome's real
// import sorter and formatter, or that `astro check` still likes it -- only
// running the client's own `lint`/`typecheck`/`build` scripts against the
// CLI's actual output proves that.
//
// Prerequisite: a registry reachable at REGISTRY_URL (defaults to Verdaccio
// on http://localhost:4873). Start one locally with `moon run verdaccio:up`.

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  addOrdersModule,
  installClient,
  publishAll,
  removeOrdersModule,
  scaffoldClient,
  sh,
} from "./shared.ts";

async function main(): Promise<void> {
  const version = publishAll();

  const scratchParent = mkdtempSync(path.join(tmpdir(), "takontuku-e2e-modules-"));
  const clientDir = scaffoldClient(scratchParent, "gate-modules", version);
  console.log(`Scaffolded client (auth + catalog + orders) at ${clientDir}`);

  installClient(clientDir);

  removeOrdersModule(clientDir);
  installClient(clientDir);
  console.log("Removed the orders module.");

  addOrdersModule(clientDir);
  installClient(clientDir);
  console.log("Added the orders module back.");

  // astro check needs worker-configuration.d.ts (env.d.ts references it),
  // which only `wrangler types` generates -- no other gate calls typecheck
  // against a scaffolded client, so this step has never run before here.
  sh("bun", ["run", "cf-typegen"], clientDir);
  sh("bun", ["run", "lint"], clientDir);
  sh("bun", ["run", "typecheck"], clientDir);
  sh("bun", ["run", "build"], clientDir);

  console.log("");
  console.log(
    `Gate (modules) passed: real Biome lint, astro check, and build all accept the rewritten files. Scratch client left at ${clientDir} for inspection.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
