import { createTsupConfig } from "@tokotuku/config/tsup";

export default createTsupConfig({
  // Only index.ts is bundled — it's the one thing a plain-Node consumer
  // (the tokotuku CLI, run under a #!/usr/bin/env node shebang even via
  // bunx) needs to import without Vite's TS-stripping. The route .astro
  // files stay raw source; Astro/Vite always processes those anyway.
  entry: ["src/index.ts"],
  platform: "node",
});
