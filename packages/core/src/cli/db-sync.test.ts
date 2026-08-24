import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readLockfile, syncMigrations } from "./db-sync";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "karsa-db-sync-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function writeSourceMigration(fileName: string, content: string): Promise<URL> {
  const filePath = path.join(dir, fileName);
  await writeFile(filePath, content);
  return pathToFileURL(filePath);
}

describe("syncMigrations", () => {
  it("writes each module's migrations to migrationsDir and persists the lockfile", async () => {
    const catalogUrl = await writeSourceMigration(
      "catalog-init.sql",
      "CREATE TABLE catalog_items (id INTEGER PRIMARY KEY);\n",
    );
    const migrationsDir = path.join(dir, "migrations");
    const lockfilePath = path.join(dir, "karsa.migrations.json");

    const result = await syncMigrations({
      modules: [{ name: "catalog", migrations: [{ name: "init", url: catalogUrl }] }],
      lockfilePath,
      migrationsDir,
    });

    expect(result.written).toEqual(["0000_catalog_init.sql"]);
    const written = await readFile(path.join(migrationsDir, "0000_catalog_init.sql"), "utf8");
    expect(written).toBe("CREATE TABLE catalog_items (id INTEGER PRIMARY KEY);\n");

    const lockfile = await readLockfile(lockfilePath);
    expect(lockfile).toEqual({ nextSequence: 1, modules: { catalog: 1 } });
  });

  it("returns an empty lockfile when none exists yet, instead of throwing", async () => {
    const lockfile = await readLockfile(path.join(dir, "does-not-exist.json"));
    expect(lockfile).toEqual({ nextSequence: 0, modules: {} });
  });

  it("does nothing on a second run with the same modules", async () => {
    const catalogUrl = await writeSourceMigration("catalog-init.sql", "CREATE TABLE x (id INT);\n");
    const migrationsDir = path.join(dir, "migrations");
    const lockfilePath = path.join(dir, "karsa.migrations.json");
    const modules = [{ name: "catalog", migrations: [{ name: "init", url: catalogUrl }] }];

    await syncMigrations({ modules, lockfilePath, migrationsDir });
    const second = await syncMigrations({ modules, lockfilePath, migrationsDir });

    expect(second.written).toEqual([]);
  });

  it("adds a later module's migration without rewriting the first module's file", async () => {
    const catalogUrl = await writeSourceMigration("catalog-init.sql", "-- catalog\n");
    const migrationsDir = path.join(dir, "migrations");
    const lockfilePath = path.join(dir, "karsa.migrations.json");

    await syncMigrations({
      modules: [{ name: "catalog", migrations: [{ name: "init", url: catalogUrl }] }],
      lockfilePath,
      migrationsDir,
    });

    const bookingUrl = await writeSourceMigration("booking-init.sql", "-- booking\n");
    const result = await syncMigrations({
      modules: [
        { name: "catalog", migrations: [{ name: "init", url: catalogUrl }] },
        { name: "booking", migrations: [{ name: "init", url: bookingUrl }] },
      ],
      lockfilePath,
      migrationsDir,
    });

    expect(result.written).toEqual(["0001_booking_init.sql"]);
    // The original file is untouched — still there, still numbered 0000.
    const original = await readFile(path.join(migrationsDir, "0000_catalog_init.sql"), "utf8");
    expect(original).toBe("-- catalog\n");
  });
});
