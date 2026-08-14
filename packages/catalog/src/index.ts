import { defineModule, type ModuleDefinition } from "@tokotuku/core";

export function catalog(): ModuleDefinition {
  return defineModule({
    name: "catalog",
    migrations: [
      { name: "init", url: new URL("../migrations/0001_init.sql", import.meta.url) },
      { name: "inventory", url: new URL("../migrations/0002_inventory.sql", import.meta.url) },
      { name: "projects", url: new URL("../migrations/0003_projects.sql", import.meta.url) },
    ],
    mediaPrefixes: ["products/"],
    adminNav: [{ label: "Products", href: "/admin/products", icon: "products", order: 30 }],
    storefrontRoutes: [
      { pattern: "/products", entrypoint: "@tokotuku/catalog/routes/products/index.astro" },
      { pattern: "/products/[id]", entrypoint: "@tokotuku/catalog/routes/products/[id].astro" },
    ],
    adminRoutes: [
      { pattern: "/admin/products", entrypoint: "@tokotuku/catalog/routes/admin/products.astro" },
      {
        pattern: "/admin/products/new",
        entrypoint: "@tokotuku/catalog/routes/admin/products/new.astro",
      },
      {
        pattern: "/admin/products/[id]/edit",
        entrypoint: "@tokotuku/catalog/routes/admin/products/[id]/edit.astro",
      },
    ],
  });
}

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
