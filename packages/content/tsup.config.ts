import { createTsupConfig } from "@karsa/config/tsup";

export default createTsupConfig({
  // The package entry is the only source bundled for the CLI/module loader.
  // Astro consumes the route and component source through the package exports.
  entry: ["src/index.ts"],
  platform: "node",
});
