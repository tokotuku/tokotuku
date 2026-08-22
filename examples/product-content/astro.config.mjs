// @ts-check
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { auth } from "@takontuku/auth";
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
        name: "Racik Rasa",
        locale: "id-ID",
        currency: "IDR",
        timeZone: "Asia/Jakarta",
        palette: {
          light: { accent: "#8f3d24", accentForeground: "#fffaf2" },
          dark: { accent: "#e49a68", accentForeground: "#2b1710" },
        },
        storefront: {
          announcement: "Rempah pilihan untuk masakan yang terasa pulang.",
          hero: {
            eyebrow: "Racik Rasa",
            title: "Bumbu yang menghidupkan cerita di meja makan.",
            description: "Racikan rempah Indonesia dalam kemasan praktis untuk dapur sehari-hari.",
          },
          links: [{ label: "Tentang Racik Rasa", href: "/" }],
        },
        messages: {
          "catalog.storefront.description":
            "Jelajahi bumbu dan rempah Racik Rasa untuk dapur sehari-hari.",
        },
      },
      modules: [auth(), jarene(), catalog(), orders()],
    }),
  ],
  // @takontuku/ui's Layout.astro imports its own CSS, which needs this plugin.
  vite: { plugins: [tailwindcss()] },
  output: "server",
  adapter: cloudflare({
    persistState: true,
  }),
});
