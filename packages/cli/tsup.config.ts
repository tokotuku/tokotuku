import { createTsupConfig } from "@tokotuku/config/tsup";

export default createTsupConfig({
  entry: ["src/cli.ts"],
  platform: "node",
});
