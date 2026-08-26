import { describe, expect, it } from "vitest";
import { verifySetupToken } from "./setup";

describe("verifySetupToken", () => {
  const token = "a".repeat(32);

  it("accepts the configured token and rejects missing or wrong values", async () => {
    await expect(verifySetupToken(token, token)).resolves.toBe(true);
    await expect(verifySetupToken(token, "b".repeat(32))).resolves.toBe(false);
    await expect(verifySetupToken(undefined, token)).resolves.toBe(false);
    await expect(verifySetupToken(token, "short")).resolves.toBe(false);
  });
});
