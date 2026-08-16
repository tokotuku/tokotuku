#!/usr/bin/env node
// Gate 2 from the migration plan ("a-la-carte nyata"): proves that dropping
// an optional module leaves zero trace, not just that installing
// everything works -- Gate 1 already proves the "everything installed"
// case. "Tes yang meng-assert ketiadaan modul opsional itulah yang
// membuktikan seam-nya — tes hijau pada install penuh tidak membuktikan
// apa-apa."
//
// The plan's original Gate 2 describes fixtures spanning content, projects,
// inquiry, inventory, shipping, and payments-bank-transfer -- none of which
// exist as separate packages yet (inventory and projects tables currently
// live inside catalog's own migrations; payments-bank-transfer inside
// orders'). This is the version of that gate achievable with today's actual
// module set: a client with {auth, catalog} only, built by scaffolding
// normally and then dropping the orders module -- the exact steps
// astro.config.mjs's own comment documents for a real client to follow.
//
// Prerequisite: a registry reachable at REGISTRY_URL (defaults to Verdaccio
// on http://localhost:4873). Start one locally with `moon run verdaccio:up`.

import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  AssertionError,
  assert,
  dropOrdersModule,
  installClient,
  publishAll,
  queryTableNames,
  scaffoldClient,
  setupAndLogIn,
  sh,
  waitForServer,
} from "./shared.ts";

const BOOT_CHECK_PORT = 8798;
const ADMIN = {
  name: "Gate2 Admin",
  email: "admin@gate2-fixture.local",
  password: "gate2fixturepass123",
};

/** Boots the fixture, completes setup, and asserts orders-shaped affordances are absent from both the admin nav and a storefront product page while catalog itself still works. */
async function bootAndAssert(clientDir: string): Promise<void> {
  const origin = `http://localhost:${BOOT_CHECK_PORT}`;
  const child = spawn("bunx", ["wrangler", "dev", "--port", String(BOOT_CHECK_PORT)], {
    cwd: clientDir,
    stdio: "inherit",
    detached: true,
  });

  try {
    await waitForServer(`${origin}/setup`, 30_000);
    const cookie = await setupAndLogIn(origin, ADMIN);

    const adminHtml = await (
      await fetch(`${origin}/admin`, { headers: { Cookie: cookie } })
    ).text();
    assert(
      adminHtml.includes('href="/admin/products"'),
      "admin nav should still show catalog's Products entry",
    );
    assert(
      !adminHtml.includes('href="/admin/orders"'),
      "admin nav should not show an Orders entry without the orders module",
    );

    const productsHtml = await (await fetch(`${origin}/products`)).text();
    assert(
      !productsHtml.includes("data-add-to-cart"),
      "storefront should not render add-to-cart affordances without the orders module",
    );

    console.log("Boot check passed: setup, login, and both absence assertions.");
  } finally {
    if (child.pid) process.kill(-child.pid, "SIGTERM");
  }
}

async function main(): Promise<void> {
  const version = publishAll();

  const scratchParent = mkdtempSync(path.join(tmpdir(), "takontuku-e2e-fixture-"));
  const clientDir = scaffoldClient(scratchParent, "gate2-fixture", version);
  dropOrdersModule(clientDir);
  console.log(`Scaffolded fixture (auth + catalog, no orders) at ${clientDir}`);

  installClient(clientDir);
  sh("bunx", ["takontuku", "db", "sync"], clientDir);
  sh("bunx", ["wrangler", "d1", "migrations", "apply", "DB", "--local"], clientDir);

  const tables = queryTableNames(clientDir);
  console.log(`Tables present: ${tables.sort().join(", ")}`);
  assert(!tables.includes("orders"), "orders table must not exist without the orders module");
  assert(
    !tables.includes("order_items"),
    "order_items table must not exist without the orders module",
  );
  assert(
    !tables.includes("payments_bank_transfer_proofs"),
    "payments_bank_transfer_proofs table must not exist without the orders module",
  );
  assert(
    tables.includes("catalog_items"),
    "catalog_items should still exist -- catalog is installed",
  );
  assert(tables.includes("user"), "user should still exist -- auth is installed");

  sh("bun", ["run", "build"], clientDir);
  await bootAndAssert(clientDir);

  console.log("");
  console.log(`Gate 2 passed. Scratch fixture left at ${clientDir} for inspection.`);
}

main().catch((error) => {
  console.error(error instanceof AssertionError ? `Gate 2 FAILED: ${error.message}` : error);
  process.exitCode = 1;
});
