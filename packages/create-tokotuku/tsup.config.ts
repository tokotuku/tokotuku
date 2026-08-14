import { createTsupConfig } from "@tokotuku/config/tsup";

export default createTsupConfig({
  entry: ["src/bin.ts"],
  platform: "node",
  dts: false,
});
