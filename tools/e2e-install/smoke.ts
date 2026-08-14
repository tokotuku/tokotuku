#!/usr/bin/env node
// Gate 3 from the migration plan ("runtime smoke"): the golden path a real
// customer and admin actually walk, against a tarball-installed client --
// setup -> login -> storefront lists a real item -> checkout creates an
// order -> the order row lands in D1 -> admin sees it -> a status
// transition sticks. Gates 1/2/2b all prove the package graph installs and
// migrates correctly; none of them click through the application itself.
//
// The plan's original Gate 3 also includes "submit inquiry" -- there's no
// `inquiry` package yet, so that step is skipped here.
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
  installClient,
  publishAll,
  queryD1,
  scaffoldClient,
  setupAndLogIn,
  sh,
  waitForServer,
} from "./shared.ts";

const BOOT_CHECK_PORT = 8797;
const ADMIN = {
  name: "Gate3 Admin",
  email: "admin@gate3-smoke.local",
  password: "gate3smokepass123",
};

function seedProduct(clientDir: string): number {
  queryD1(
    clientDir,
    "INSERT INTO catalog_items (name, description, price_cents, image_key, sku, category) " +
      "VALUES ('Gate 3 Smoke Widget', 'A real product for the golden-path smoke test', 25000, 'catalog/widget.jpg', 'GATE3-001', 'Test')",
  );
  const [row] = queryD1(clientDir, "SELECT id FROM catalog_items WHERE sku = 'GATE3-001'");
  assert(row !== undefined, "expected the seeded product to exist");
  const id = row.id as number;
  queryD1(clientDir, `INSERT INTO inventory_item_stock (item_id, on_hand) VALUES (${id}, 50)`);
  return id;
}

async function placeOrder(origin: string, cookie: string, productId: number): Promise<string> {
  const response = await fetch(`${origin}/checkout`, {
    method: "POST",
    redirect: "manual",
    headers: {
      Origin: origin,
      Referer: `${origin}/checkout`,
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookie,
    },
    body: new URLSearchParams({
      cart: JSON.stringify([{ id: productId, quantity: 1 }]),
      paymentMethod: "cash",
      customerName: "Gate3 Customer",
      customerPhone: "081234567890",
      address: "Jl. Gate 3 No. 1",
      city: "Jakarta",
      postalCode: "12345",
      note: "",
    }),
  });
  assert(
    response.status === 303 || response.status === 302,
    `expected checkout POST to redirect, got ${response.status}`,
  );
  const location = response.headers.get("location");
  assert(location !== null, "expected checkout POST to set a Location header");
  const orderNumber = new URL(location, origin).searchParams.get("order");
  assert(
    orderNumber !== null,
    `expected an order number in the redirect location, got "${location}"`,
  );
  return orderNumber;
}

async function transitionStatus(
  origin: string,
  cookie: string,
  orderId: number,
  status: string,
): Promise<void> {
  const response = await fetch(`${origin}/admin/orders`, {
    method: "POST",
    redirect: "manual",
    headers: {
      Origin: origin,
      Referer: `${origin}/admin/orders`,
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookie,
    },
    body: new URLSearchParams({ orderId: String(orderId), status }),
  });
  assert(
    response.status === 303 || response.status === 302,
    `expected status-update POST to redirect, got ${response.status}`,
  );
}

async function runSmokeTest(clientDir: string, productId: number): Promise<void> {
  const origin = `http://localhost:${BOOT_CHECK_PORT}`;
  const child = spawn("bunx", ["wrangler", "dev", "--port", String(BOOT_CHECK_PORT)], {
    cwd: clientDir,
    stdio: "inherit",
    detached: true,
  });

  try {
    await waitForServer(`${origin}/setup`, 30_000);
    const cookie = await setupAndLogIn(origin, ADMIN);
    console.log("setup + login: ok");

    const listHtml = await (await fetch(`${origin}/products`)).text();
    assert(
      listHtml.includes("Gate 3 Smoke Widget"),
      "storefront listing should show the seeded product",
    );
    console.log("storefront lists the seeded item: ok");

    const detailHtml = await (await fetch(`${origin}/products/${productId}`)).text();
    assert(
      detailHtml.includes("Gate 3 Smoke Widget"),
      "storefront detail page should show the seeded product",
    );
    console.log("storefront detail page renders: ok");

    const orderNumber = await placeOrder(origin, cookie, productId);
    console.log(`checkout created order ${orderNumber}: ok`);

    const [orderRow] = queryD1(
      clientDir,
      `SELECT id, status, customer_email FROM orders WHERE order_number = '${orderNumber}'`,
    );
    assert(orderRow !== undefined, "expected the order to land in D1");
    assert(
      orderRow.customer_email === ADMIN.email,
      "order's customer_email should match the checking-out user",
    );
    console.log(`order row in D1: ${JSON.stringify(orderRow)}`);

    const adminOrdersHtml = await (
      await fetch(`${origin}/admin/orders`, { headers: { Cookie: cookie } })
    ).text();
    assert(adminOrdersHtml.includes(orderNumber), "admin orders list should show the new order");
    console.log("admin sees the order: ok");

    await transitionStatus(origin, cookie, orderRow.id as number, "confirmed");
    const [orderAfter] = queryD1(clientDir, `SELECT status FROM orders WHERE id = ${orderRow.id}`);
    assert(orderAfter !== undefined, "expected the order to still exist after the status update");
    assert(
      orderAfter.status === "confirmed",
      `expected order status to be "confirmed" after the transition, got "${orderAfter.status}"`,
    );
    console.log("status transition (pending -> confirmed): ok");
  } finally {
    if (child.pid) process.kill(-child.pid, "SIGTERM");
  }
}

async function main(): Promise<void> {
  const version = publishAll();

  const scratchParent = mkdtempSync(path.join(tmpdir(), "tokotuku-e2e-smoke-"));
  const clientDir = scaffoldClient(scratchParent, "gate3-smoke", version);
  console.log(`Scaffolded client at ${clientDir}`);

  installClient(clientDir);
  sh("bunx", ["tokotuku", "db", "sync"], clientDir);
  sh("bunx", ["wrangler", "d1", "migrations", "apply", "DB", "--local"], clientDir);
  const productId = seedProduct(clientDir);
  sh("bun", ["run", "build"], clientDir);

  await runSmokeTest(clientDir, productId);

  console.log("");
  console.log(`Gate 3 passed. Scratch client left at ${clientDir} for inspection.`);
}

main().catch((error) => {
  console.error(error instanceof AssertionError ? `Gate 3 FAILED: ${error.message}` : error);
  process.exitCode = 1;
});
