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
          light: { accent: "#2f6b57", accentForeground: "#ffffff" },
          dark: { accent: "#8bd0ae", accentForeground: "#153b2d" },
        },
        storefront: {
          announcement: "Perawatan penuh perhatian untuk sahabat berbulu Anda",
          hero: {
            eyebrow: "Teman Ekor",
            title: "Layanan nyaman untuk setiap ekor",
            description:
              "Penitipan, grooming, dan jalan-jalan yang dirancang dengan perhatian untuk hewan kesayangan Anda.",
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
