#!/usr/bin/env node
// The concrete "does this actually work for a new client" walkthrough:
// bare install -> seed -> change the design. Gates 1/2/2b/3/5 all prove the
// package graph installs, migrates, and updates correctly; none of them
// exercise seeding or theme overrides -- two mechanisms that, before this
// script existed, had never been proven to work end to end (seeding had no
// framework mechanism at all, and the theme override alias had a bug that
// only a unit test asserting the raw regex, never the actual `.replace()`
// output, had let ship unnoticed).
//
// Prerequisite: a registry reachable at REGISTRY_URL (defaults to Verdaccio
// on http://localhost:4873). Start one locally with `moon run verdaccio:up`.

import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  AssertionError,
  assert,
  installClient,
  publishAll,
  queryD1,
  scaffoldClient,
  setupAndLogIn,
  sh,
  waitForServer,
} from "./shared.ts";

const BOOT_CHECK_PORT = 8795;
const ADMIN = {
  name: "Demo Admin",
  email: "admin@demo-walkthrough.local",
  password: "demowalkthroughpass123",
};

const CUSTOM_PRODUCT_CARD = `---
const { name, price } = Astro.props;
---
<article class="my-custom-product-card" data-theme-override="true">
  <h2>{name}</h2>
  <p>{price}</p>
</article>
`;

async function bootAndFetch(clientDir: string, paths: string[]): Promise<Map<string, Response>> {
  const origin = `http://localhost:${BOOT_CHECK_PORT}`;
  const child = spawn("bunx", ["wrangler", "dev", "--port", String(BOOT_CHECK_PORT)], {
    cwd: clientDir,
    stdio: "inherit",
    detached: true,
  });

  try {
    await waitForServer(`${origin}/setup`, 30_000);
    await setupAndLogIn(origin, ADMIN);
    const responses = new Map<string, Response>();
    for (const p of paths) responses.set(p, await fetch(`${origin}${p}`));
    return responses;
  } finally {
    if (child.pid) process.kill(-child.pid, "SIGTERM");
  }
}

async function main(): Promise<void> {
  const version = publishAll();

  const scratchParent = mkdtempSync(path.join(tmpdir(), "takontuku-e2e-demo-"));
  const clientDir = scaffoldClient(scratchParent, "demo-walkthrough", version);
  console.log(`Scaffolded client at ${clientDir}`);

  // --- Step 1: bare install -----------------------------------------------
  installClient(clientDir);
  sh("bunx", ["takontuku", "db", "sync"], clientDir);
  sh("bunx", ["wrangler", "d1", "migrations", "apply", "DB", "--local"], clientDir);
  sh("bun", ["run", "build"], clientDir);

  const bareResponses = await bootAndFetch(clientDir, ["/products"]);
  const bareHtml = await bareResponses.get("/products")?.text();
  assert(bareHtml !== undefined, "expected /products to respond on the bare install");
  assert(
    bareHtml.includes("Koleksi segera hadir") && bareHtml.includes('data-catalog-empty="true"'),
    "a bare install should show the empty-catalog state",
  );
  assert(
    !bareHtml.includes("Cangkir Stoneware"),
    "a bare install should have zero seeded products",
  );
  console.log("Step 1 (bare install): storefront is empty, as expected.");

  // --- Step 2: seed ---------------------------------------------------------
  sh("bunx", ["takontuku", "db", "seed"], clientDir);

  const catalogCount = queryD1(clientDir, "SELECT COUNT(*) as count FROM catalog_items");
  assert(
    catalogCount[0]?.count === 6,
    `expected 6 seeded catalog_items, got ${catalogCount[0]?.count}`,
  );
  const stockCount = queryD1(clientDir, "SELECT COUNT(*) as count FROM inventory_item_stock");
  assert(
    stockCount[0]?.count === 6,
    `expected 6 seeded inventory_item_stock rows, got ${stockCount[0]?.count}`,
  );
  const orderCount = queryD1(clientDir, "SELECT COUNT(*) as count FROM orders");
  assert(
    orderCount[0]?.count === 0,
    `db:seed must not create fake orders, got ${orderCount[0]?.count}`,
  );

  const seededResponses = await bootAndFetch(clientDir, [
    "/products",
    "/api/images/products/cangkir-stoneware.webp",
  ]);
  const seededHtml = await seededResponses.get("/products")?.text();
  assert(
    seededHtml?.includes("Cangkir Stoneware"),
    "storefront should list the seeded catalog after db seed",
  );
  const imageResponse = seededResponses.get("/api/images/products/cangkir-stoneware.webp");
  assert(imageResponse !== undefined, "expected a response for the seeded product image");
  assert(
    imageResponse.status === 200,
    `expected the seeded image to be servable, got ${imageResponse.status}`,
  );
  assert(
    imageResponse.headers.get("content-type") === "image/webp",
    `expected image/webp, got "${imageResponse.headers.get("content-type")}"`,
  );
  console.log(
    "Step 2 (seed): 6 catalog rows + stock, storefront lists them, seeded WebP serves 200.",
  );

  // --- Step 3: change the design (theme override) ---------------------------
  const themeDir = path.join(clientDir, "src", "theme");
  mkdirSync(themeDir, { recursive: true });
  writeFileSync(path.join(themeDir, "ProductCard.astro"), CUSTOM_PRODUCT_CARD);
  sh("bun", ["run", "build"], clientDir);

  const themedResponses = await bootAndFetch(clientDir, ["/products"]);
  const themedHtml = await themedResponses.get("/products")?.text();
  assert(themedHtml !== undefined, "expected /products to respond after the theme override");
  assert(
    themedHtml.includes('data-theme-override="true"'),
    "storefront should render the overridden ProductCard after adding src/theme/ProductCard.astro",
  );
  assert(
    !themedHtml.includes("data-add-to-cart"),
    "storefront should no longer render the stock ProductCard's markup once overridden",
  );
  console.log(
    "Step 3 (change the design): storefront renders the themed override, not the stock component.",
  );

  console.log("");
  console.log(`All three steps passed. Scratch client left at ${clientDir} for inspection.`);
}

main().catch((error) => {
  console.error(
    error instanceof AssertionError ? `Demo walkthrough FAILED: ${error.message}` : error,
  );
  process.exitCode = 1;
});
