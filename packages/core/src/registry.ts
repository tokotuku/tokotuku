import type {
  AdminNavItem,
  ModuleDefinition,
  ModuleMigration,
  ModuleRoute,
  ModuleSeed,
} from "./module";

export interface ResolvedModule {
  name: string;
  migrations: ModuleMigration[];
  seeds: ModuleSeed[];
}

export interface ResolvedRegistry {
  moduleNames: string[];
  guardedPrefixes: string[];
  mediaPrefixes: string[];
  adminNav: AdminNavItem[];
  storefrontRoutes: ModuleRoute[];
  adminRoutes: ModuleRoute[];
  ambientScripts: string[];
  /** Modules in topo order, carrying just enough for `tokotuku db sync` to plan migrations. */
  modules: ResolvedModule[];
}

/**
 * Topo-sorts modules by `requires` and merges their contributions into one
 * registry. Throws on a missing or circular dependency — both are
 * misconfiguration a client should fix before the app boots, not something
 * to silently work around.
 */
export function resolveModules(modules: ModuleDefinition[]): ResolvedRegistry {
  const byName = new Map(modules.map((mod) => [mod.name, mod]));
  const sorted: ModuleDefinition[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(mod: ModuleDefinition): void {
    if (visited.has(mod.name)) return;
    if (visiting.has(mod.name)) {
      throw new Error(
        `Circular module dependency detected at "${mod.name}". Check the "requires" list of each module involved.`,
      );
    }
    visiting.add(mod.name);
    for (const depName of mod.requires ?? []) {
      const dep = byName.get(depName);
      if (!dep) {
        throw new Error(
          `"${mod.name}" requires "${depName}", which is not installed. Run: bun add @tokotuku/${depName}`,
        );
      }
      visit(dep);
    }
    visiting.delete(mod.name);
    visited.add(mod.name);
    sorted.push(mod);
  }

  for (const mod of modules) visit(mod);

  return {
    moduleNames: sorted.map((mod) => mod.name),
    guardedPrefixes: sorted.flatMap((mod) => mod.guardedPrefixes ?? []),
    mediaPrefixes: sorted.flatMap((mod) => mod.mediaPrefixes ?? []),
    adminNav: sorted
      .flatMap((mod) => mod.adminNav ?? [])
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    storefrontRoutes: sorted.flatMap((mod) => mod.storefrontRoutes ?? []),
    adminRoutes: sorted.flatMap((mod) => mod.adminRoutes ?? []),
    ambientScripts: sorted.flatMap((mod) => mod.ambientScripts ?? []),
    modules: sorted.map((mod) => ({
      name: mod.name,
      migrations: mod.migrations ?? [],
      seeds: mod.seeds ?? [],
    })),
  };
}
