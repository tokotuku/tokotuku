// @ts-check
import cloudflare from "@astrojs/cloudflare";
import { auth } from "@karsa/auth";
import { content } from "@karsa/content";
import { karsa } from "@karsa/core";
import { jarene } from "@karsa/jarene";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// Run "karsa add <module>" or "karsa remove <module>" to change
// what this client has installed -- it edits this file, src/middleware.ts,
// and package.json for you.
export default defineConfig({
  integrations: [
    karsa({
      brand: {
        name: "Karsa Journal",
        locale: "id-ID",
        currency: "IDR",
        timeZone: "Asia/Jakarta",
        palette: {
          light: { accent: "#b85c38", accentForeground: "#fffaf2" },
          dark: { accent: "#f0a276", accentForeground: "#291914" },
        },
        site: {
          announcement: "Catatan tentang kerja yang berarti",
          hero: {
            eyebrow: "Karsa Journal",
            title: "Gagasan untuk hidup dan kerja yang lebih utuh.",
            description:
              "Catatan, percakapan, dan praktik yang kami kumpulkan dari perjalanan sehari-hari.",
            image: "/images/karsa-journal-hero.png",
            imagePosition: "center",
            primaryAction: { label: "Baca tulisan terbaru", href: "/blog" },
          },
          links: [
            { label: "Jurnal", href: "/blog" },
            { label: "RSS", href: "/rss.xml" },
          ],
        },
      },
      modules: [auth({ registration: "closed" }), jarene(), content()],
    }),
  ],
  // @karsa/ui's Layout.astro imports its own CSS, which needs this plugin.
  vite: { plugins: [tailwindcss()] },
  output: "server",
  adapter: cloudflare({
    persistState: true,
  }),
});
