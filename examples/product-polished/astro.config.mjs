// @ts-check
import cloudflare from "@astrojs/cloudflare";
import { auth } from "@karsa/auth";
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
        name: "Racik Rasa",
        locale: "id-ID",
        currency: "IDR",
        timeZone: "Asia/Jakarta",
        palette: {
          light: { accent: "#9A4427", accentForeground: "#FFF9F0" },
          dark: { accent: "#E3A16E", accentForeground: "#2A1710" },
        },
        site: {
          announcement: "Rempah pilihan untuk masakan yang terasa pulang.",
          hero: {
            eyebrow: "Racik Rasa",
            title: "Bumbu yang menghidupkan cerita di meja makan.",
            description:
              "Kopi, teh, rempah, dan sambal pilihan untuk ritual kecil yang membuat rumah terasa dekat.",
            image: "/images/racik-rasa-hero.png",
            imagePosition: "center",
          },
        },
        messages: {
          "catalog.storefront.eyebrow": "Dari dapur kami",
          "catalog.storefront.title": "Racikan untuk hari-hari yang lebih berasa.",
          "catalog.storefront.description":
            "Jelajahi bahan pilihan Racik Rasa untuk seduhan, masakan, dan sambal sehari-hari.",
          "catalog.storefront.collectionEyebrow": "Pilihan Racik Rasa",
          "catalog.storefront.collectionHeading": "Buka selera",
          "catalog.products.description":
            "{count} pilihan dalam {categories} kategori untuk menemani dapur harianmu.",
        },
      },
      modules: [
        auth({ registration: "public" }),
        jarene(),
        catalog({ presentation: "products" }),
        orders({ presentation: "orders" }),
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
