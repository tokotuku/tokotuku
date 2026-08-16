import { defineModule, type ModuleDefinition } from "@takontuku/core";

export function catalog(): ModuleDefinition {
  return defineModule({
    name: "catalog",
    migrations: [
      { name: "init", url: new URL("../migrations/0001_init.sql", import.meta.url) },
      { name: "inventory", url: new URL("../migrations/0002_inventory.sql", import.meta.url) },
      { name: "projects", url: new URL("../migrations/0003_projects.sql", import.meta.url) },
    ],
    mediaPrefixes: ["products/"],
    seeds: [
      {
        name: "demo-catalog",
        sql: new URL("../seeds/demo-catalog.sql", import.meta.url),
        media: new URL("../seeds/media", import.meta.url),
      },
    ],
    adminNav: [
      {
        label: "Products",
        labelByLocale: { id: "Produk", en: "Products" },
        descriptionByLocale: { id: "Kelola produk dan stok.", en: "Manage products and stock." },
        href: "/admin/products",
        icon: "products",
        order: 30,
      },
    ],
    storefrontRoutes: [
      { pattern: "/products", entrypoint: "@takontuku/catalog/routes/products/index.astro" },
      { pattern: "/products/[id]", entrypoint: "@takontuku/catalog/routes/products/[id].astro" },
      { pattern: "/sitemap.xml", entrypoint: "@takontuku/catalog/routes/sitemap.xml.ts" },
    ],
    storefrontHomeSections: [
      {
        id: "catalog-collection",
        entrypoint: "@takontuku/catalog/routes/StorefrontCollection.astro",
        order: 20,
      },
    ],
    adminDashboardWidgets: [
      {
        id: "catalog-overview",
        entrypoint: "@takontuku/catalog/routes/admin/CatalogDashboardWidget.astro",
        area: "main",
        order: 20,
      },
    ],
    adminRoutes: [
      { pattern: "/admin/products", entrypoint: "@takontuku/catalog/routes/admin/products.astro" },
      {
        pattern: "/admin/products/new",
        entrypoint: "@takontuku/catalog/routes/admin/products/new.astro",
      },
      {
        pattern: "/admin/products/[id]/edit",
        entrypoint: "@takontuku/catalog/routes/admin/products/[id]/edit.astro",
      },
    ],
  });
}

export { catalogMessages } from "./messages";
export { productInputFromForm } from "./product-form";
export {
  archiveProduct,
  countProducts,
  createProduct,
  findProductById,
  findProductsByIds,
  type InventoryMovement,
  type ListProductsOptions,
  listCategories,
  listInventoryMovements,
  listProducts,
  type Product,
  type ProductInput,
  updateProduct,
} from "./products";
