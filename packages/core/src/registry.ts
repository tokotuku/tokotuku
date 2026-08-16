import type {
  AdminDashboardWidget,
  AdminNavItem,
  ModuleDefinition,
  ModuleMigration,
  ModuleRoute,
  ModuleSeed,
  StorefrontHomeSection,
} from "./module";

export interface ResolvedModule {
  name: string;
  /** Names of other modules this one requires -- carried through so `takontuku remove` can refuse when a still-installed module depends on the one being dropped. */
  requires: string[];
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
  storefrontHomeSections: StorefrontHomeSection[];
  adminDashboardWidgets: AdminDashboardWidget[];
  /** Modules in topo order, carrying just enough for `takontuku db sync` to plan migrations. */
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
          `"${mod.name}" requires "${depName}", which is not installed. Run: takontuku add @takontuku/${depName}`,
        );
      }
      visit(dep);
    }
    visiting.delete(mod.name);
    visited.add(mod.name);
    sorted.push(mod);
  }

  for (const mod of modules) visit(mod);

  const storefrontHomeSections = sorted.flatMap((mod, dependencyOrder) =>
    (mod.storefrontHomeSections ?? []).map((section, localOrder) => ({
      ...section,
      __dependencyOrder: dependencyOrder,
      __localOrder: localOrder,
    })),
  );
  const dashboardWidgets = sorted.flatMap((mod, dependencyOrder) =>
    (mod.adminDashboardWidgets ?? []).map((widget, localOrder) => ({
      ...widget,
      __dependencyOrder: dependencyOrder,
      __localOrder: localOrder,
    })),
  );
  function stableContributions<
    T extends { id: string; order?: number; __dependencyOrder: number; __localOrder: number },
  >(contributions: T[], kind: string): T[] {
    const ids = new Set<string>();
    for (const contribution of contributions) {
      if (ids.has(contribution.id)) {
        throw new Error(
          "Duplicate " +
            kind +
            ' contribution id "' +
            contribution.id +
            '". Contribution ids must be unique.',
        );
      }
      ids.add(contribution.id);
    }
    return contributions.sort(
      (a, b) =>
        (a.order ?? 0) - (b.order ?? 0) ||
        a.__dependencyOrder - b.__dependencyOrder ||
        a.__localOrder - b.__localOrder,
    );
  }
  const orderedSections = stableContributions(
    storefrontHomeSections,
    "storefront home section",
  ).map(
    ({ __dependencyOrder: _dependencyOrder, __localOrder: _localOrder, ...section }) => section,
  );
  const orderedWidgets = stableContributions(dashboardWidgets, "admin dashboard widget").map(
    ({ __dependencyOrder: _dependencyOrder, __localOrder: _localOrder, ...widget }) => widget,
  );

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
    storefrontHomeSections: orderedSections,
    adminDashboardWidgets: orderedWidgets,
    modules: sorted.map((mod) => ({
      name: mod.name,
      requires: mod.requires ?? [],
      migrations: mod.migrations ?? [],
      seeds: mod.seeds ?? [],
    })),
  };
}
