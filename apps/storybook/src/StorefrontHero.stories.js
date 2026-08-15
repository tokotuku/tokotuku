import StorefrontHero from "@tokotuku/ui/StorefrontHero.astro";

export default {
  title: "Storefront/StorefrontHero",
  component: StorefrontHero,
  parameters: { layout: "fullscreen" },
};
export const Light = {
  args: {
    title: "Objects that make a day feel like home.",
    description: "Small choices made with honest materials and room to be used every day.",
    primaryLabel: "Explore the collection",
  },
};
export const Dark = {
  args: {
    title: "Objects that make a day feel like home.",
    description: "A dark mode snapshot with the same editorial hierarchy.",
    primaryLabel: "Explore the collection",
  },
  globals: { theme: "dark" },
};
