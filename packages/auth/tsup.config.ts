import { createTsupConfig } from "@karsa/config/tsup";

export default createTsupConfig({
  // Only index.ts is bundled — see packages/catalog/tsup.config.ts for why.
  entry: ["src/index.ts"],
  platform: "node",
});
