// @ts-check
import alpinejs from "@astrojs/alpinejs";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [alpinejs()],
  vite: { plugins: [tailwindcss()] },
  srcDir: "../../template/apps/web/src",
  publicDir: "../../template/apps/web/public",
  output: "server",
  server: {
    host: "127.0.0.1",
    port: 4400,
  },
  adapter: cloudflare({
    configPath: "../../template/apps/web/wrangler.jsonc",
    persistState: {
      path: "../../template/apps/web/.wrangler/state",
    },
  }),
});
