// @ts-check
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { auth } from "@takontuku/auth";
import { takontuku } from "@takontuku/core";
import { jarene } from "@takontuku/jarene";
import { defineConfig } from "astro/config";

// Run "takontuku add <module>" or "takontuku remove <module>" to change
// what this client has installed -- it edits this file, src/middleware.ts,
// and package.json for you.
export default defineConfig({
  integrations: [
    takontuku({
      brand: {
        name: "Arunika Energi",
        locale: "id-ID",
        currency: "IDR",
        timeZone: "Asia/Jakarta",
        storefront: {
          announcement: "Energi yang tumbuh bersama Indonesia",
          links: [
            { label: "Tentang kami", href: "#tentang" },
            { label: "Kapabilitas", href: "#kapabilitas" },
            { label: "Proyek", href: "#proyek" },
            { label: "Kontak", href: "#kontak" },
          ],
        },
        // Optional: use a local public asset or an absolute CDN/R2 URL.
        // auth: { backgroundImage: "/images/auth-commerce.webp", backgroundPosition: "center" },
      },
      modules: [auth(), jarene()],
    }),
  ],
  // @takontuku/ui's Layout.astro imports its own CSS, which needs this plugin.
  vite: { plugins: [tailwindcss()] },
  output: "server",
  adapter: cloudflare({
    persistState: true,
  }),
});
