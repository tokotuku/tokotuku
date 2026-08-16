#!/usr/bin/env node
// Gate 2b from the migration plan ("nambah modul belakangan"): the scenario
// that actually happens to a real client. They start with a subset of
// modules, run for a while with real data, then add one. Migration
// numbering must be append-only, not topo-order -- a purely topological
// scheme (auth=0, catalog=10, orders=20) breaks the moment a module whose
// topo position falls *between* two already-installed modules gets added
// later, because it would need a number smaller than migrations already
// applied, and wrangler sorts by filename. "Ini yang menangkap bug
// penomoran topo-order — dan skenario ini persis yang akan terjadi ke
// client asli."
//
// Builds a client with {auth, catalog}, migrates it, inserts a real
// product row, then adds `orders` and re-syncs. Asserts every
// already-applied migration file is byte-for-byte unchanged (no rewrite,
// no renumbering), the new migrations get sequence numbers strictly higher
// than everything already applied, and the pre-existing product survived.
//
// Prerequisite: a registry reachable at REGISTRY_URL (defaults to Verdaccio
// on http://localhost:4873). Start one locally with `moon run verdaccio:up`.

import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  AssertionError,
  addOrdersModule,
  assert,
  installClient,
  publishAll,
  queryD1,
  queryTableNames,
  readJson,
  removeOrdersModule,
  scaffoldClient,
  sh,
} from "./shared.ts";

function readMigrationFiles(clientDir: string): Map<string, string> {
  const dir = path.join(clientDir, "migrations");
  const files = new Map<string, string>();
  for (const name of readdirSync(dir)) {
    files.set(name, readFileSync(path.join(dir, name), "utf8"));
  }
  return files;
}

function migrationSequence(fileName: string): number {
  const match = /^(\d+)_/.exec(fileName);
  assert(match !== null, `migration filename "${fileName}" doesn't start with a sequence number`);
  return Number(match[1]);
}

async function main(): Promise<void> {
  const version = publishAll();

  const scratchParent = mkdtempSync(path.join(tmpdir(), "takontuku-e2e-upgrade-"));
  const clientDir = scaffoldClient(scratchParent, "gate2b-fixture", version);
  console.log(`Scaffolded client (auth + catalog + orders) at ${clientDir}`);

  installClient(clientDir);
  removeOrdersModule(clientDir);
  installClient(clientDir);
  console.log(
    "Removed the orders module via `takontuku remove` -- fixture is now auth + catalog only.",
  );

  sh("bunx", ["takontuku", "db", "sync"], clientDir);
  sh("bunx", ["wrangler", "d1", "migrations", "apply", "DB", "--local"], clientDir);

  const filesBefore = readMigrationFiles(clientDir);
  const lockfileBefore = readJson(path.join(clientDir, "takontuku.migrations.json"));
  console.log(`Migrations before upgrade: ${[...filesBefore.keys()].sort().join(", ")}`);
  console.log(`Lockfile before upgrade: ${JSON.stringify(lockfileBefore)}`);
  assert(filesBefore.size > 0, "expected at least one migration file before the upgrade");

  queryD1(
    clientDir,
    "INSERT INTO catalog_items (name, description, price_cents, image_key, sku, category) " +
      "VALUES ('Gate 2b Test Product', 'Proves pre-existing data survives a later module install', 50000, 'catalog/test.jpg', 'GATE2B-001', 'Test')",
  );
  const [productBefore] = queryD1(
    clientDir,
    "SELECT id, name, sku FROM catalog_items WHERE sku = 'GATE2B-001'",
  );
  assert(productBefore !== undefined, "expected the test product to be inserted");
  console.log(`Inserted product: ${JSON.stringify(productBefore)}`);

  console.log("Adding the orders module back via `takontuku add` and re-syncing...");
  addOrdersModule(clientDir);
  installClient(clientDir);
  sh("bunx", ["takontuku", "db", "sync"], clientDir);
  sh("bunx", ["wrangler", "d1", "migrations", "apply", "DB", "--local"], clientDir);

  const filesAfter = readMigrationFiles(clientDir);
  const lockfileAfter = readJson(path.join(clientDir, "takontuku.migrations.json"));
  console.log(`Migrations after upgrade: ${[...filesAfter.keys()].sort().join(", ")}`);
  console.log(`Lockfile after upgrade: ${JSON.stringify(lockfileAfter)}`);

  for (const [name, content] of filesBefore) {
    assert(
      filesAfter.has(name),
      `migration "${name}" that existed before the upgrade is now missing`,
    );
    assert(
      filesAfter.get(name) === content,
      `migration "${name}" was rewritten by the upgrade -- already-applied migrations must never change`,
    );
  }

  const highestBefore = Math.max(...[...filesBefore.keys()].map(migrationSequence));
  const newFiles = [...filesAfter.keys()].filter((name) => !filesBefore.has(name));
  assert(newFiles.length > 0, "expected the upgrade to add at least one new migration file");
  for (const name of newFiles) {
    assert(
      migrationSequence(name) > highestBefore,
      `new migration "${name}" must have a sequence number higher than ${highestBefore}, the highest already applied`,
    );
  }

  const tables = queryTableNames(clientDir);
  assert(tables.includes("orders"), "orders table should exist after adding the orders module");
  assert(
    tables.includes("order_items"),
    "order_items table should exist after adding the orders module",
  );

  const [productAfter] = queryD1(
    clientDir,
    "SELECT id, name, sku FROM catalog_items WHERE sku = 'GATE2B-001'",
  );
  assert(productAfter !== undefined, "the pre-existing product must survive the upgrade");
  assert(
    JSON.stringify(productAfter) === JSON.stringify(productBefore),
    "the pre-existing product's data must be unchanged after the upgrade",
  );

  sh("bun", ["run", "build"], clientDir);

  console.log("");
  console.log(`Gate 2b passed. Scratch fixture left at ${clientDir} for inspection.`);
}

main().catch((error) => {
  console.error(error instanceof AssertionError ? `Gate 2b FAILED: ${error.message}` : error);
  process.exitCode = 1;
});
