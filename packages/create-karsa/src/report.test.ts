import { describe, expect, it } from "vitest";
import { manualSetupSteps } from "./report";

describe("manualSetupSteps", () => {
  it("includes agent skills before generated types and migrations", () => {
    expect(manualSetupSteps("coffee-shop", "npm")).toEqual([
      "cd coffee-shop",
      "npm install",
      "bunx karsa skills install",
      "npm run cf-typegen",
      "bunx karsa db sync",
      "bunx wrangler d1 migrations apply DB --local",
      "npm run dev",
    ]);
  });
});
