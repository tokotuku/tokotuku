// @ts-check
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { auth } from "@tokotuku/auth";
import { catalog } from "@tokotuku/catalog";
import { tokotuku } from "@tokotuku/core";
import { orders } from "@tokotuku/orders";
import { defineConfig } from "astro/config";

// Remove a module here (and its matching import above + middleware.ts
// register line) to drop it from this client entirely — `bun remove` the
// package too. Nothing else references an uninstalled module by name.
export default defineConfig({
  integrations: [
    tokotuku({
      brand: {
        name: "Example Bare",
        locale: "id-ID",
        currency: "IDR",
        timeZone: "Asia/Jakarta",
        // Optional: use a local public asset or an absolute CDN/R2 URL.
        // auth: { backgroundImage: "/images/auth-commerce.webp", backgroundPosition: "center" },
      },
      modules: [auth(), catalog(), orders()],
    }),
  ],
  // @tokotuku/ui's Layout.astro imports its own CSS, which needs this plugin.
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
