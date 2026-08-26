import { createTsupConfig } from "@karsa/config/tsup";

export default [
  createTsupConfig(),
  // `karsa db sync` — a node CLI, not app code, so it gets its own
  // platform/entry/clean settings rather than joining the browser-targeted
  // build above (clean: false so it doesn't wipe that build's dist/ output).
  createTsupConfig({
    entry: { "cli/bin": "src/cli/bin.ts" },
    platform: "node",
    dts: false,
    clean: false,
  }),
];
