import type {
  AdminDashboardWidget,
  AdminNavItem,
  AuthPanelWidget,
  ModuleDefinition,
  ModuleMigration,
  ModuleRoute,
  ModuleSeed,
  SiteHomeSection,
  SitemapSourceContribution,
} from "./module";

export interface ResolvedModule {
  name: string;
  /** Names of other modules this one requires -- carried through so `karsa remove` can refuse when a still-installed module depends on the one being dropped. */
  requires: string[];
  migrations: ModuleMigration[];
  seeds: ModuleSeed[];
}

export interface ResolvedRegistry {
  moduleNames: string[];
  guardedPrefixes: string[];
  mediaPrefixes: string[];
  adminNav: AdminNavItem[];
  siteRoutes: ModuleRoute[];
  adminRoutes: ModuleRoute[];
  ambientScripts: string[];
  siteHomeSections: SiteHomeSection[];
  clientConfig: Record<string, Record<string, import("./module").JsonValue>>;
  requiredBrandFields: Array<"currency">;
  sitemapSources: SitemapSourceContribution[];
  adminDashboardWidgets: AdminDashboardWidget[];
  authPanelWidgets: AuthPanelWidget[];
  /** Modules in topo order, carrying just enough for `karsa db sync` to plan migrations. */
  modules: ResolvedModule[];
}

/**
 * Topo-sorts modules by `requires` and merges their contributions into one
 * registry. Throws on a missing or circular dependency — both are
 * misconfiguration a client should fix before the app boots, not something
 * to silently work around.
 */
export function resolveModules(modules: ModuleDefinition[]): ResolvedRegistry {
  const byName = new Map<string, ModuleDefinition>();
  for (const mod of modules) {
    if (byName.has(mod.name)) {
      throw new Error(
        `Duplicate module id "${mod.name}". Module names must be unique in the installed registry.`,
      );
    }
    byName.set(mod.name, mod);
  }
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
          `"${mod.name}" requires "${depName}", which is not installed. Run: karsa add @karsa/${depName}`,
        );
      }
      visit(dep);
    }
    visiting.delete(mod.name);
    visited.add(mod.name);
    sorted.push(mod);
  }

  for (const mod of modules) visit(mod);

  const siteHomeSections = sorted.flatMap((mod, dependencyOrder) =>
    (mod.siteHomeSections ?? []).map((section, localOrder) => ({
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
  const authPanelWidgets = sorted.flatMap((mod, dependencyOrder) =>
    (mod.authPanelWidgets ?? []).map((widget, localOrder) => ({
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
  const orderedSections = stableContributions(siteHomeSections, "site home section").map(
    ({ __dependencyOrder: _dependencyOrder, __localOrder: _localOrder, ...section }) => section,
  );
  const orderedWidgets = stableContributions(dashboardWidgets, "admin dashboard widget").map(
    ({ __dependencyOrder: _dependencyOrder, __localOrder: _localOrder, ...widget }) => widget,
  );
  const orderedAuthPanelWidgets = stableContributions(authPanelWidgets, "auth panel widget").map(
    ({ __dependencyOrder: _dependencyOrder, __localOrder: _localOrder, ...widget }) => widget,
  );

  return {
    moduleNames: sorted.map((mod) => mod.name),
    guardedPrefixes: sorted.flatMap((mod) => mod.guardedPrefixes ?? []),
    mediaPrefixes: sorted.flatMap((mod) => mod.mediaPrefixes ?? []),
    adminNav: sorted
      .flatMap((mod) => mod.adminNav ?? [])
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    siteRoutes: sorted.flatMap((mod) => mod.siteRoutes ?? []),
    adminRoutes: sorted.flatMap((mod) => mod.adminRoutes ?? []),
    ambientScripts: sorted.flatMap((mod) => mod.ambientScripts ?? []),
    siteHomeSections: orderedSections,
    clientConfig: Object.fromEntries(sorted.map((mod) => [mod.name, mod.clientConfig ?? {}])),
    requiredBrandFields: [...new Set(sorted.flatMap((mod) => mod.requiredBrandFields ?? []))],
    sitemapSources: stableContributions(
      sorted.flatMap((mod, dependencyOrder) =>
        (mod.sitemapSources ?? []).map((source, localOrder) => ({
          ...source,
          __dependencyOrder: dependencyOrder,
          __localOrder: localOrder,
        })),
      ),
      "sitemap source",
    ).map(
      ({ __dependencyOrder: _dependencyOrder, __localOrder: _localOrder, ...source }) => source,
    ),
    adminDashboardWidgets: orderedWidgets,
    authPanelWidgets: orderedAuthPanelWidgets,
    modules: sorted.map((mod) => ({
      name: mod.name,
      requires: mod.requires ?? [],
      migrations: mod.migrations ?? [],
      seeds: mod.seeds ?? [],
    })),
  };
}
