import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { emptyLockfile, type MigrationLockfile, planMigrationSync } from "../migrations";
import type { ModuleMigration } from "../module";

export interface SyncMigrationsOptions {
  /** Modules in topo order, as carried on `ResolvedRegistry.modules`. */
  modules: { name: string; migrations: ModuleMigration[] }[];
  lockfilePath: string;
  migrationsDir: string;
}

export interface SyncMigrationsResult {
  written: string[];
}

export async function readLockfile(lockfilePath: string): Promise<MigrationLockfile> {
  try {
    return JSON.parse(await readFile(lockfilePath, "utf8")) as MigrationLockfile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyLockfile();
    throw error;
  }
}

async function writeLockfile(lockfilePath: string, lockfile: MigrationLockfile): Promise<void> {
  await writeFile(lockfilePath, `${JSON.stringify(lockfile, null, 2)}\n`);
}

/**
 * Materializes every not-yet-synced module migration into `migrationsDir`
 * and persists the updated lockfile. Never rewrites or removes a file it
 * already wrote on a previous run — see planMigrationSync for why.
 */
export async function syncMigrations({
  modules,
  lockfilePath,
  migrationsDir,
}: SyncMigrationsOptions): Promise<SyncMigrationsResult> {
  const lockfile = await readLockfile(lockfilePath);
  const { plan, lockfile: nextLockfile } = planMigrationSync(modules, lockfile);
  if (plan.length === 0) return { written: [] };

  await mkdir(migrationsDir, { recursive: true });
  const written: string[] = [];
  for (const item of plan) {
    const content = await readFile(fileURLToPath(item.migration.url), "utf8");
    await writeFile(path.join(migrationsDir, item.fileName), content);
    written.push(item.fileName);
  }
  await writeLockfile(lockfilePath, nextLockfile);
  return { written };
}
