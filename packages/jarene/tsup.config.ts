import { createTsupConfig } from "@karsa/config/tsup";

export default createTsupConfig({
  entry: ["src/index.ts"],
  platform: "node",
});
