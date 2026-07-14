import { createTsupConfig } from "@tokotuku/config/tsup";

// One output file per icon (src/icons/*.ts -> dist/icons/*.js) so consumers
// can import a single icon without pulling in the rest of the set.
export default createTsupConfig({
  entry: ["src/index.ts", "src/icons/*.ts", "!src/icons/*.test.ts"],
});
