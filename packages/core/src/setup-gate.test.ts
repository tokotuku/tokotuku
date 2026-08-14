import { beforeEach, describe, expect, it } from "vitest";
import { checkSetupGate, registerSetupGate, resetSetupGate } from "./setup-gate";

describe("setup gate", () => {
  beforeEach(() => {
    resetSetupGate();
  });

  it("returns null when no gate is registered", async () => {
    expect(await checkSetupGate()).toBeNull();
  });

  it("delegates to the registered check", async () => {
    registerSetupGate(async () => true);
    expect(await checkSetupGate()).toBe(true);
  });
});
