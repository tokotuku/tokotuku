import { describe, expect, it } from "vitest";
import type { ModuleDefinition } from "./module";
import { resolveModules } from "./registry";

describe("resolveModules", () => {
  it("orders modules so a dependency always comes before its dependent", () => {
    const catalog: ModuleDefinition = { name: "catalog" };
    const orders: ModuleDefinition = { name: "orders", requires: ["catalog"] };

    const registry = resolveModules([orders, catalog]);

    expect(registry.moduleNames).toEqual(["catalog", "orders"]);
  });

  it("throws naming the missing package when a dependency is not installed", () => {
    const orders: ModuleDefinition = { name: "orders", requires: ["catalog"] };
    expect(() => resolveModules([orders])).toThrow(/requires "catalog".*@takontuku\/catalog/s);
  });

  it("throws on a circular dependency instead of hanging", () => {
    const a: ModuleDefinition = { name: "a", requires: ["b"] };
    const b: ModuleDefinition = { name: "b", requires: ["a"] };
    expect(() => resolveModules([a, b])).toThrow(/Circular module dependency/);
  });

  it("merges guardedPrefixes, adminRoutes, and storefrontRoutes across modules", () => {
    const catalog: ModuleDefinition = {
      name: "catalog",
      guardedPrefixes: ["/admin/products"],
      storefrontRoutes: [
        { pattern: "/products", entrypoint: "@takontuku/catalog/routes/products.astro" },
      ],
      adminRoutes: [
        {
          pattern: "/admin/products",
          entrypoint: "@takontuku/catalog/routes/admin/products.astro",
        },
      ],
    };
    const orders: ModuleDefinition = {
      name: "orders",
      requires: ["catalog"],
      guardedPrefixes: ["/admin/orders"],
    };

    const registry = resolveModules([catalog, orders]);

    expect(registry.guardedPrefixes).toEqual(["/admin/products", "/admin/orders"]);
    expect(registry.storefrontRoutes).toHaveLength(1);
    expect(registry.adminRoutes).toHaveLength(1);
  });

  it("sorts merged adminNav by order, treating a missing order as 0", () => {
    const catalog: ModuleDefinition = {
      name: "catalog",
      adminNav: [{ label: "Products", href: "/admin/products", icon: "products", order: 20 }],
    };
    const dashboard: ModuleDefinition = {
      name: "dashboard",
      adminNav: [{ label: "Dashboard", href: "/admin", icon: "dashboard" }],
    };

    const registry = resolveModules([catalog, dashboard]);

    expect(registry.adminNav.map((item) => item.label)).toEqual(["Dashboard", "Products"]);
  });

  it("merges mediaPrefixes across modules", () => {
    const catalog: ModuleDefinition = { name: "catalog", mediaPrefixes: ["catalog/"] };
    const payments: ModuleDefinition = { name: "payments", mediaPrefixes: ["payment-proofs/"] };

    const registry = resolveModules([catalog, payments]);

    expect(registry.mediaPrefixes).toEqual(["catalog/", "payment-proofs/"]);
  });

  it("returns an empty registry for an empty module list", () => {
    const registry = resolveModules([]);
    expect(registry).toEqual({
      moduleNames: [],
      guardedPrefixes: [],
      mediaPrefixes: [],
      adminNav: [],
      storefrontRoutes: [],
      adminRoutes: [],
      ambientScripts: [],
      storefrontHomeSections: [],
      adminDashboardWidgets: [],
      modules: [],
    });
  });

  it("merges contributions in stable order and rejects duplicate ids", () => {
    const registry = resolveModules([
      {
        name: "catalog",
        storefrontHomeSections: [{ id: "collection", entrypoint: "./collection.astro", order: 20 }],
        adminDashboardWidgets: [
          { id: "catalog", entrypoint: "./catalog.astro", area: "main", order: 20 },
        ],
      },
      {
        name: "orders",
        requires: ["catalog"],
        storefrontHomeSections: [{ id: "values", entrypoint: "./values.astro", order: 30 }],
        adminDashboardWidgets: [
          { id: "orders", entrypoint: "./orders.astro", area: "main", order: 20 },
        ],
      },
    ]);
    expect(registry.storefrontHomeSections.map((item) => item.id)).toEqual([
      "collection",
      "values",
    ]);
    expect(registry.adminDashboardWidgets.map((item) => item.id)).toEqual(["catalog", "orders"]);
    expect(() =>
      resolveModules([
        { name: "one", storefrontHomeSections: [{ id: "same", entrypoint: "./one.astro" }] },
        { name: "two", storefrontHomeSections: [{ id: "same", entrypoint: "./two.astro" }] },
      ]),
    ).toThrow(/Duplicate storefront home section contribution id/);
  });

  it("carries each module's migrations through in topo order, defaulting to none", () => {
    const catalog: ModuleDefinition = {
      name: "catalog",
      migrations: [{ name: "init", url: new URL("https://example.test/catalog/0001_init.sql") }],
    };
    const orders: ModuleDefinition = { name: "orders", requires: ["catalog"] };

    const registry = resolveModules([orders, catalog]);

    expect(registry.modules).toEqual([
      { name: "catalog", requires: [], migrations: catalog.migrations, seeds: [] },
      { name: "orders", requires: ["catalog"], migrations: [], seeds: [] },
    ]);
  });

  it("carries each module's seeds through in topo order, defaulting to none", () => {
    const catalog: ModuleDefinition = {
      name: "catalog",
      seeds: [{ name: "demo-catalog", sql: new URL("https://example.test/catalog/demo.sql") }],
    };

    const registry = resolveModules([catalog]);

    expect(registry.modules).toEqual([
      { name: "catalog", requires: [], migrations: [], seeds: catalog.seeds },
    ]);
  });
});
