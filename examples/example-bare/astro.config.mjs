// @ts-check
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { auth } from "@takontuku/auth";
import { catalog } from "@takontuku/catalog";
import { takontuku } from "@takontuku/core";
import { orders } from "@takontuku/orders";
import { defineConfig } from "astro/config";

// Remove a module here (and its matching import above + middleware.ts
// register line) to drop it from this client entirely — `bun remove` the
// package too. Nothing else references an uninstalled module by name.
export default defineConfig({
  integrations: [
    takontuku({
      brand: {
        name: "Example Bare",
        locale: "id-ID",
        currency: "IDR",
        timeZone: "Asia/Jakarta",
      },
      modules: [auth(), catalog(), orders()],
    }),
  ],
  // @takontuku/ui's Layout.astro imports its own CSS, which needs this plugin.
  vite: { plugins: [tailwindcss()] },
  output: "server",
  // Distinct from apps/example-seeded and apps/example-styled so all three
  // can run `astro dev` at the same time without a port clash.
  server: {
    host: "127.0.0.1",
    port: 4410,
  },
  adapter: cloudflare({
    persistState: true,
  }),
});
