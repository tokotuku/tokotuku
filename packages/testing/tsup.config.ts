import { createTsupConfig } from "@tokotuku/config/tsup";

// Separate entry so consumers of the Vitest-facing "." export don't pull in
// @axe-core/playwright and Playwright's types.
export default createTsupConfig({
  entry: ["src/index.ts", "src/playwright/index.ts"],
});
