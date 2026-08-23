#!/usr/bin/env bun
/**
 * Publishes @takontuku/catalog, @takontuku/orders, and @takontuku/booking --
 * the packages that never go to public npm -- to the private registry. Run manually
 * from a machine with publish credentials there; this deliberately has no
 * CI counterpart (see .github/workflows/ci.yml, which only ever publishes
 * the public packages) so a release never depends on that registry's
 * uptime.
 *
 * The version published is whatever `changeset version` last left in each
 * package's package.json -- never a throwaway. See publish-local.ts for the
 * local-rehearsal counterpart that publishes every package, public ones
 * included, to a throwaway registry.
 */

import { publishPackage, ROOT, sh } from "./publish-shared";

const DRY_RUN = process.argv.includes("--dry-run");

/**
 * No tunnel hostname exists yet (tools/verdaccio's cloudflared service is
 * wired up but still waiting on a Cloudflare Tunnel token -- see that
 * directory's README). Defaulting to localhost is honest about that: it
 * only works from this machine today. Once the tunnel is live, export
 * PRIVATE_REGISTRY_URL=https://npm.<your-domain> instead of relying on
 * this default.
 */
const { PRIVATE_REGISTRY_URL } = process.env;
const REGISTRY = PRIVATE_REGISTRY_URL ?? "http://localhost:4873";

// Publish order matters: orders' workspace:* on catalog, and booking's on
// both catalog and orders, must each resolve to an already-published version.
const PRIVATE_PACKAGES = ["packages/catalog", "packages/orders", "packages/booking"];

function main(): void {
  console.log(`Publishing private modules to ${REGISTRY}${DRY_RUN ? " (dry run)" : ""}`);
  sh("moon", ["run", "catalog:build", "orders:build", "booking:build"], ROOT);
  // All three packages are scoped (@takontuku/catalog, @takontuku/orders,
  // @takontuku/booking), so none hit the unscoped-name auth problem
  // withDefaultRegistryForPublish exists for -- @takontuku:registry= in
  // .npmrc anchors them by itself.
  for (const dir of PRIVATE_PACKAGES) {
    publishPackage({
      dir,
      registry: REGISTRY,
      dryRun: DRY_RUN,
      guard: (pkg) => {
        if (pkg.version === "0.0.0") {
          throw new Error(
            `${dir}/package.json is still at 0.0.0 -- run \`bun run version\` (changeset version) first.`,
          );
        }
      },
    });
  }
}

main();
