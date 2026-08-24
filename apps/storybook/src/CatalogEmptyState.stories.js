import CatalogEmptyState from "@karsa/ui/CatalogEmptyState.astro";

export default {
  title: "Catalog/EmptyCollection",
  component: CatalogEmptyState,
  parameters: { layout: "fullscreen" },
};
export const Visitor = {
  args: {
    title: "The collection is coming",
    description: "We are preparing the first selection for everyday spaces and rituals.",
  },
};
export const Staff = {
  args: {
    title: "Start with one product",
    description: "Add your first product to begin building the catalog.",
    actionHref: "/admin/products/new",
    actionLabel: "Add first product",
  },
};
