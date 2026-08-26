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
        // Optional: use a local public asset or an absolute CDN/R2 URL.
        // auth: { backgroundImage: "/images/auth-site.webp", backgroundPosition: "center" },
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
