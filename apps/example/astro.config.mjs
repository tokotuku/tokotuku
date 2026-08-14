// @ts-check
import alpinejs from "@astrojs/alpinejs";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { auth } from "@tokotuku/auth";
import { catalog } from "@tokotuku/catalog";
import { tokotuku } from "@tokotuku/core";
import { orders } from "@tokotuku/orders";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  integrations: [
    alpinejs(),
    tokotuku({
      brand: {
        name: "Tokotuku",
        locale: "id-ID",
        currency: "IDR",
        timeZone: "Asia/Jakarta",
        auth: { backgroundImage: "/auth-commerce.webp", backgroundPosition: "center" },
      },
      modules: [auth(), catalog(), orders()],
    }),
  ],
  vite: { plugins: [tailwindcss()] },
  output: "server",
  server: {
    host: "127.0.0.1",
    port: 4400,
  },
  adapter: cloudflare({
    persistState: true,
  }),
});
