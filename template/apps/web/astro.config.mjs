// @ts-check
import alpinejs from "@astrojs/alpinejs";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  integrations: [alpinejs()],
  vite: { plugins: [tailwindcss()] },
  output: "server",
  adapter: cloudflare({
    persistState: true,
  }),
});
