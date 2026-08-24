import { defineModule, type ModuleDefinition } from "@karsa/core";

export type CatalogPresentation = "products" | "services";
export interface CatalogOptions {
  presentation: CatalogPresentation;
}

/** Products remain the backwards-compatible default for `karsa add catalog`. */
export function catalog(
  { presentation }: CatalogOptions = { presentation: "products" },
): ModuleDefinition {
  const services = presentation === "services";
  const publicBase = services ? "/services" : "/products";
  const adminBase = services ? "/admin/services" : "/admin/products";
  return defineModule({
    name: "catalog",
    clientConfig: { presentation },
    requiredBrandFields: ["currency"],
    migrations: [
      { name: "init", url: new URL("../migrations/0001_init.sql", import.meta.url) },
      { name: "inventory", url: new URL("../migrations/0002_inventory.sql", import.meta.url) },
      { name: "projects", url: new URL("../migrations/0003_projects.sql", import.meta.url) },
      {
        name: "admin-cursor-indexes",
        url: new URL("../migrations/0004_admin_cursor_indexes.sql", import.meta.url),
      },
      {
        name: "inventory-allocations",
        url: new URL("../migrations/0005_inventory_allocations.sql", import.meta.url),
      },
    ],
    mediaPrefixes: ["products/", "services/"],
    seeds: [
      {
        name: "demo-catalog",
        sql: new URL("../seeds/demo-catalog.sql", import.meta.url),
        media: new URL("../seeds/media", import.meta.url),
      },
    ],
    adminNav: [
      {
        label: services ? "Services" : "Products",
        labelByLocale: services
          ? { id: "Layanan", en: "Services" }
          : { id: "Produk", en: "Products" },
        descriptionByLocale: services
          ? { id: "Kelola layanan dan harga.", en: "Manage services and pricing." }
          : { id: "Kelola produk dan stok.", en: "Manage products and stock." },
        href: adminBase,
        icon: "products",
        order: 30,
      },
    ],
    siteRoutes: [
      { pattern: publicBase, entrypoint: "@karsa/catalog/routes/products/index.astro" },
      { pattern: `${publicBase}/[id]`, entrypoint: "@karsa/catalog/routes/products/[id].astro" },
    ],
    sitemapSources: [
      { id: "catalog-items", entrypoint: "@karsa/catalog/sitemap-source", order: 20 },
    ],
    siteHomeSections: [
      {
        id: "catalog-collection",
        entrypoint: "@karsa/catalog/components/storefront/StorefrontCollection.astro",
        order: 20,
      },
    ],
    adminDashboardWidgets: [
      {
        id: "catalog-overview",
        entrypoint: "@karsa/catalog/components/admin/CatalogDashboardWidget.astro",
        area: "main",
        order: 20,
      },
    ],
    adminRoutes: [
      {
        pattern: adminBase,
        entrypoint: services
          ? "@karsa/catalog/routes/admin/services.astro"
          : "@karsa/catalog/routes/admin/products.astro",
      },
      {
        pattern: services ? "/admin/api/services/[id]" : "/admin/api/products/[id]",
        entrypoint: "@karsa/catalog/routes/api/admin/products/[id].ts",
      },
      {
        pattern: `${adminBase}/new`,
        entrypoint: "@karsa/catalog/routes/admin/products/new.astro",
      },
      {
        pattern: `${adminBase}/[id]/edit`,
        entrypoint: "@karsa/catalog/routes/admin/products/[id]/edit.astro",
      },
    ],
  });
}

export { catalogItemInputFromForm } from "./catalog-item-form";
export {
  archiveItem,
  type CatalogDashboardSummary,
  type CatalogItem,
  type CatalogItemInput,
  countItems,
  createItem,
  findItemById,
  findItemsByIds,
  getCatalogDashboardSummary,
  type InventoryMovement,
  type ListItemsOptions,
  listCategories,
  listInventoryMovements,
  listItems,
  updateItem,
} from "./catalog-items";
export { catalogMessages, createCatalogTranslator } from "./messages";
