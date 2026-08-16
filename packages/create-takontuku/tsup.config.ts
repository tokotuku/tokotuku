import { createTsupConfig } from "@takontuku/config/tsup";

export default createTsupConfig({
  entry: ["src/bin.ts"],
  platform: "node",
  dts: false,
});
