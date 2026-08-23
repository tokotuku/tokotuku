import { describe, expect, it } from "vitest";
import { resolveModules } from "./registry";
import { takontukuVirtualModulesPlugin } from "./virtual-modules-plugin";

function readDefault(source: unknown): unknown {
  if (typeof source !== "string") throw new Error("virtual module did not return source");
  return JSON.parse(source.replace(/^export default /, "").replace(/;\s*$/, ""));
}

describe("takontuku virtual config modules", () => {
  it("keeps legacy brand configuration valid without optional auth fields", () => {
    const brand = { name: "Legacy Shop", locale: "en-US", currency: "USD" };
    const plugin = takontukuVirtualModulesPlugin(resolveModules([]), brand);
    const resolveId = plugin.resolveId as (id: string) => string;
    const load = plugin.load as (id: string) => string;
    expect(readDefault(load(resolveId("virtual:takontuku/config")))).toEqual(brand);
  });

  it("serializes the extended brand identically for config and module consumers", () => {
    const brand = {
      name: "Warm Market",
      locale: "id-ID",
      currency: "IDR",
      timeZone: "Asia/Jakarta",
      admin: { dashboardArtwork: "energy" as const },
      auth: { backgroundImage: "/images/auth.webp", backgroundPosition: "center 30%" },
      messages: { "auth.login.title": "Masuk ke Warm Market" },
    };
    const registry = resolveModules([
      {
        name: "catalog",
        adminNav: [
          {
            label: "Products",
            labelByLocale: { id: "Produk", en: "Products" },
            href: "/admin/products",
            icon: "products",
          },
        ],
      },
    ]);
    const plugin = takontukuVirtualModulesPlugin(registry, brand);
    const resolveId = plugin.resolveId as (id: string) => string;
    const load = plugin.load as (id: string) => string;
    const configId = resolveId("virtual:takontuku/config");
    const navId = resolveId("virtual:takontuku/admin-nav");

    expect(readDefault(load(configId))).toEqual(brand);
    expect(readDefault(load(navId))).toEqual(registry.adminNav);
  });

  it("emits importable component virtual modules for contributions", () => {
    const registry = resolveModules([
      {
        name: "catalog",
        storefrontHomeSections: [{ id: "collection", entrypoint: "@demo/Collection.astro" }],
        adminDashboardWidgets: [
          { id: "catalog", entrypoint: "@demo/CatalogWidget.astro", area: "main" },
        ],
        authPanelWidgets: [{ id: "quote", entrypoint: "@demo/AuthQuote.astro" }],
      },
    ]);
    const plugin = takontukuVirtualModulesPlugin(registry, {
      name: "Demo",
      locale: "en-US",
      currency: "USD",
    });
    const resolveId = plugin.resolveId as (id: string) => string;
    const load = plugin.load as (id: string) => string;
    const storefrontSource = load(resolveId("virtual:takontuku/storefront-home-sections"));
    const dashboardSource = load(resolveId("virtual:takontuku/admin-dashboard-widgets"));
    const authSource = load(resolveId("virtual:takontuku/auth-panel-widgets"));
    expect(storefrontSource).toContain('import Section0 from "@demo/Collection.astro";');
    expect(dashboardSource).toContain('import Widget0 from "@demo/CatalogWidget.astro";');
    expect(authSource).toContain('import Widget0 from "@demo/AuthQuote.astro";');
  });
});
