// @ts-check
import cloudflare from "@astrojs/cloudflare";
import { auth } from "@karsa/auth";
import { booking } from "@karsa/booking";
import { catalog } from "@karsa/catalog";
import { karsa } from "@karsa/core";
import { jarene } from "@karsa/jarene";
import { orders } from "@karsa/orders";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// Run "karsa add <module>" or "karsa remove <module>" to change
// what this client has installed -- it edits this file, src/middleware.ts,
// and package.json for you.
export default defineConfig({
  integrations: [
    karsa({
      brand: {
        name: "Teman Ekor",
        locale: "id-ID",
        currency: "IDR",
        timeZone: "Asia/Jakarta",
        palette: {
          light: { accent: "#2f6b57", accentForeground: "#ffffff" },
          dark: { accent: "#8bd0ae", accentForeground: "#153b2d" },
        },
        site: {
          announcement: "Perawatan penuh perhatian untuk sahabat berbulu Anda",
          hero: {
            eyebrow: "Teman Ekor",
            title: "Layanan nyaman untuk setiap ekor",
            description:
              "Penitipan, grooming, dan jalan-jalan yang dirancang dengan perhatian untuk hewan kesayangan Anda.",
          },
        },
      },
      modules: [
        auth({ registration: "public" }),
        jarene(),
        catalog({ presentation: "services" }),
        orders({ presentation: "inquiries" }),
        booking(),
      ],
    }),
  ],
  // @karsa/ui's Layout.astro imports its own CSS, which needs this plugin.
  vite: { plugins: [tailwindcss()] },
  output: "server",
  adapter: cloudflare({
    persistState: true,
  }),
});
