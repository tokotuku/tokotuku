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
    expect(() => resolveModules([orders])).toThrow(/requires "catalog".*@tokotuku\/catalog/s);
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
        { pattern: "/products", entrypoint: "@tokotuku/catalog/routes/products.astro" },
      ],
      adminRoutes: [
        { pattern: "/admin/products", entrypoint: "@tokotuku/catalog/routes/admin/products.astro" },
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
      modules: [],
    });
  });

  it("carries each module's migrations through in topo order, defaulting to none", () => {
    const catalog: ModuleDefinition = {
      name: "catalog",
      migrations: [{ name: "init", url: new URL("https://example.test/catalog/0001_init.sql") }],
    };
    const orders: ModuleDefinition = { name: "orders", requires: ["catalog"] };

    const registry = resolveModules([orders, catalog]);

    expect(registry.modules).toEqual([
      { name: "catalog", migrations: catalog.migrations },
      { name: "orders", migrations: [] },
    ]);
  });
});
