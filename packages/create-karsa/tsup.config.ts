import { createTsupConfig } from "@karsa/config/tsup";

export default createTsupConfig({
  entry: ["src/bin.ts"],
  platform: "node",
  dts: false,
});
