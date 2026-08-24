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
// module set: a client with {auth, catalog} only, built by scaffolding the
// public-only default (auth + core + ui -- catalog and orders are private
// and never ship in the scaffold) and adding just the catalog module via
// `karsa add` -- proving both that an a-la-carte install pulls in
// nothing extra and that `add` itself works end to end.
//
// Prerequisite: a registry reachable at REGISTRY_URL (defaults to Verdaccio
// on http://localhost:4873). Start one locally with Docker Compose; see README.md.

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  AssertionError,
  addCatalogModule,
  assert,
  installClient,
  publishAll,
  queryTableNames,
  scaffoldClient,
  setupAndLogIn,
  sh,
  spawnWranglerDev,
  terminateProcessGroup,
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
  const child = spawnWranglerDev(clientDir, BOOT_CHECK_PORT);

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
    terminateProcessGroup(child);
  }
}

async function main(): Promise<void> {
  const version = publishAll();

  const scratchParent = mkdtempSync(path.join(tmpdir(), "karsa-e2e-fixture-"));
  const clientDir = scaffoldClient(scratchParent, "gate2-fixture", version);
  console.log(`Scaffolded client (public-only default: auth) at ${clientDir}`);

  installClient(clientDir);
  addCatalogModule(clientDir);
  console.log("Added the catalog module via `karsa add` -- fixture is now auth + catalog only.");

  sh("bunx", ["karsa", "db", "sync"], clientDir);
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
