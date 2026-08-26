import { createVitestConfig } from "@karsa/config/vitest";

export default createVitestConfig({
  test: {
    environment: "node",
  },
});
