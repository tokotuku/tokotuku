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
          light: { accent: "#176B67", accentForeground: "#FFFDF8" },
          dark: { accent: "#73D1C2", accentForeground: "#102B2A" },
        },
        site: {
          announcement: "Perawatan penuh perhatian untuk setiap ekor",
          hero: {
            eyebrow: "Teman Ekor",
            title: "Sahabat berbulu, selalu dalam perhatian",
            description:
              "Penitipan, grooming, dan jalan-jalan yang hangat, aman, dan mudah dijadwalkan untuk hewan kesayangan Anda.",
            image: "/images/teman-ekor-hero.png",
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
