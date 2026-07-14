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
    }),
  ],
});
