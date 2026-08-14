import type { ModuleMigration } from "./module";

export interface MigrationLockfile {
  nextSequence: number;
  /** Count of each module's migrations already synced, keyed by module name. */
  modules: Record<string, number>;
}

export function emptyLockfile(): MigrationLockfile {
  return { nextSequence: 0, modules: {} };
}

export interface PlannedMigration {
  fileName: string;
  moduleName: string;
  migration: ModuleMigration;
}

export interface SyncPlan {
  plan: PlannedMigration[];
  lockfile: MigrationLockfile;
}

/**
 * Assigns each not-yet-synced migration the next global sequence number, in
 * topo order. Numbering is append-only, not re-derived from topo order on
 * every run: a module already in the lockfile keeps its numbers no matter
 * where a newly-added module would have landed topologically, because a
 * fresh dependency can only ever require modules that are already applied.
 * Rewriting old numbers would put a later-added module's file before
 * already-applied migrations, and wrangler applies in filename order.
 */
export function planMigrationSync(
  modules: { name: string; migrations: ModuleMigration[] }[],
  lockfile: MigrationLockfile,
): SyncPlan {
  let nextSequence = lockfile.nextSequence;
  const modulesOut = { ...lockfile.modules };
  const plan: PlannedMigration[] = [];

  for (const mod of modules) {
    const alreadySynced = modulesOut[mod.name] ?? 0;
    const pending = mod.migrations.slice(alreadySynced);
    for (const migration of pending) {
      const fileName = `${String(nextSequence).padStart(4, "0")}_${mod.name}_${migration.name}.sql`;
      plan.push({ fileName, moduleName: mod.name, migration });
      nextSequence += 1;
    }
    if (pending.length > 0) {
      modulesOut[mod.name] = alreadySynced + pending.length;
    }
  }

  return { plan, lockfile: { nextSequence, modules: modulesOut } };
}
