#!/usr/bin/env bun
/**
 * Publishes every @takontuku/* package -- public and private alike -- to a
 * single local registry at whatever version is currently checked into its
 * package.json. Lets you rehearse an entire release, including the public
 * packages that normally only ever reach real npm via CI, without touching
 * npmjs.org at all.
 *
 * Complements publish-private.ts, which only ever targets catalog/orders
 * against a real private registry. This one is for local rehearsal only: it
 * publishes all seven packages and defaults to the same local Verdaccio
 * every other local tool in this repo talks to.
 */

import { publishPackage, ROOT, sh, withDefaultRegistryForPublish } from "./publish-shared";

const DRY_RUN = process.argv.includes("--dry-run");
const { LOCAL_REGISTRY_URL } = process.env;
const REGISTRY = LOCAL_REGISTRY_URL ?? "http://localhost:4873";

// Publish order matters: `bun publish` requires every workspace:* reference
// (including in devDependencies) to resolve to an already-published
// version, so each entry here must come after everything it depends on.
// ui has no build step (it publishes .astro/.css source directly), so it's
// absent from the build list further down.
const PACKAGES = [
  "configs",
  "packages/core",
  "packages/ui",
  "packages/auth",
  "packages/catalog",
  "packages/orders",
  "packages/create-takontuku",
];

function main(): void {
  console.log(`Publishing every package to ${REGISTRY}${DRY_RUN ? " (dry run)" : ""}`);
  sh(
    "moon",
    ["run", "core:build", "auth:build", "catalog:build", "orders:build", "create-takontuku:build"],
    ROOT,
  );
  withDefaultRegistryForPublish(REGISTRY, () => {
    for (const dir of PACKAGES) {
      publishPackage({ dir, registry: REGISTRY, dryRun: DRY_RUN });
    }
  });
}

main();
