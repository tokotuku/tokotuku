import { afterEach, describe, expect, it } from "vitest";
import { detectPackageManager } from "./environment";

describe("detectPackageManager", () => {
  const originalAgent = process.env.npm_config_user_agent;

  afterEach(() => {
    if (originalAgent === undefined) delete process.env.npm_config_user_agent;
    else process.env.npm_config_user_agent = originalAgent;
  });

  it.each([
    ["bun/1.3.10 npm/? node/v24", "bun"],
    ["npm/10.5.0 node/v22.0.0 linux x64", "npm"],
    ["pnpm/9.1.0 npm/? node/v22.0.0", "pnpm"],
    ["yarn/4.1.0 npm/? node/v22.0.0", "yarn"],
  ] as const)("reads %s as %s", (agent, expected) => {
    process.env.npm_config_user_agent = agent;
    expect(detectPackageManager()).toBe(expected);
  });

  it("defaults to bun when invoked directly (no user agent)", () => {
    delete process.env.npm_config_user_agent;
    expect(detectPackageManager()).toBe("bun");
  });

  it("defaults to bun for an unrecognized user agent", () => {
    process.env.npm_config_user_agent = "something-else/1.0.0";
    expect(detectPackageManager()).toBe("bun");
  });
});
