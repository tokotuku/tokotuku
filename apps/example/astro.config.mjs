// @ts-check
import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";

export default defineConfig({
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
