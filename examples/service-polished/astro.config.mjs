// @ts-check
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { auth } from "@takontuku/auth";
import { booking } from "@takontuku/booking";
import { catalog } from "@takontuku/catalog";
import { takontuku } from "@takontuku/core";
import { jarene } from "@takontuku/jarene";
import { orders } from "@takontuku/orders";
import { defineConfig } from "astro/config";

// Run "takontuku add <module>" or "takontuku remove <module>" to change
// what this client has installed -- it edits this file, src/middleware.ts,
// and package.json for you.
export default defineConfig({
  integrations: [
    takontuku({
      brand: {
        name: "Teman Ekor",
        locale: "id-ID",
        currency: "IDR",
        timeZone: "Asia/Jakarta",
        palette: {
          light: { accent: "#176B67", accentForeground: "#FFFDF8" },
          dark: { accent: "#73D1C2", accentForeground: "#102B2A" },
        },
        storefront: {
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
      modules: [auth(), jarene(), catalog(), orders(), booking()],
    }),
  ],
  // @takontuku/ui's Layout.astro imports its own CSS, which needs this plugin.
  vite: { plugins: [tailwindcss()] },
  output: "server",
  adapter: cloudflare({
    persistState: true,
  }),
});
