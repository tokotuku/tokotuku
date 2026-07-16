import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [
    starlight({
      title: "Tokotuku UI",
      description:
        "A framework-agnostic Web Components design system with first-class Astro support.",
      social: [
        { icon: "github", label: "GitHub", href: "https://github.com/tokotuku-ui/tokotuku" },
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
            { label: "Core wrappers", items: [{ autogenerate: { directory: "starter/core" } }] },
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
