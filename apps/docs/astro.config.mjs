import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  vite: { plugins: [tailwindcss()] },
  integrations: [
    starlight({
      title: "Takontuku UI",
      description: "An accessible, Astro-first component system for commerce applications.",
      social: [
        { icon: "github", label: "GitHub", href: "https://github.com/takontuku-ui/takontuku" },
      ],
      sidebar: [
        {
          label: "Start",
          items: [
            { label: "Overview", slug: "" },
            { label: "Getting started", slug: "getting-started" },
            { label: "Theming", slug: "theming" },
          ],
        },
        {
          label: "Core components",
          items: [{ autogenerate: { directory: "components" } }],
        },
        {
          label: "Starter components",
          items: [
            { label: "Feedback", items: [{ autogenerate: { directory: "starter/feedback" } }] },
            {
              label: "Data display",
              items: [{ autogenerate: { directory: "starter/data-display" } }],
            },
            { label: "Layout", items: [{ autogenerate: { directory: "starter/layout" } }] },
            {
              label: "Navigation",
              items: [{ autogenerate: { directory: "starter/navigation" } }],
            },
            {
              label: "Commerce & charts",
              items: [{ autogenerate: { directory: "starter/commerce" } }],
            },
          ],
        },
      ],
    }),
  ],
});
