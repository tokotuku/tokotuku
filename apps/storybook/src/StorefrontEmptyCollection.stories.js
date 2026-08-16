import StorefrontEmptyCollection from "@takontuku/ui/StorefrontEmptyCollection.astro";

export default {
  title: "Storefront/EmptyCollection",
  component: StorefrontEmptyCollection,
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
    description: "Add your first product to begin building the store.",
    actionHref: "/admin/products/new",
    actionLabel: "Add first product",
  },
};
