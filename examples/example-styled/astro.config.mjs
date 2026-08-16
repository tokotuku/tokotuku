// @ts-check
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { auth } from "@takontuku/auth";
import { catalog } from "@takontuku/catalog";
import { takontuku } from "@takontuku/core";
import { orders } from "@takontuku/orders";
import { defineConfig } from "astro/config";

// Run "takontuku add <module>" or "takontuku remove <module>" to change
// what this client has installed -- it edits this file, src/middleware.ts,
// and package.json for you.
export default defineConfig({
  integrations: [
    takontuku({
      brand: {
        name: "Example Styled",
        locale: "id-ID",
        currency: "IDR",
        timeZone: "Asia/Jakarta",
        // Optional: use a local public asset or an absolute CDN/R2 URL.
        // auth: { backgroundImage: "/images/auth-commerce.webp", backgroundPosition: "center" },
      },
      modules: [auth(), catalog(), orders()],
    }),
  ],
  // @takontuku/ui's Layout.astro imports its own CSS, which needs this plugin.
  vite: { plugins: [tailwindcss()] },
  output: "server",
  // Distinct from apps/example-bare and apps/example-seeded so all three
  // can run `astro dev` at the same time without a port clash.
  server: {
    host: "127.0.0.1",
    port: 4430,
  },
  adapter: cloudflare({
    persistState: true,
  }),
});
