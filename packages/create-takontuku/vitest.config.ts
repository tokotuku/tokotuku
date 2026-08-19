import { createVitestConfig } from "@takontuku/config/vitest";

export default createVitestConfig({
  test: {
    // No DOM dependency in this package -- skip happy-dom's setup cost.
    environment: "node",
  },
});
