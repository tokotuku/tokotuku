import { createTsupConfig } from "@takontuku/config/tsup";

export default createTsupConfig({
  entry: ["src/index.ts"],
  platform: "node",
});
