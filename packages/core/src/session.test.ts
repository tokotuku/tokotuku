import { beforeEach, describe, expect, it } from "vitest";
import { registerSessionResolver, resetSessionResolver, resolveSession } from "./session";

describe("session resolver", () => {
  beforeEach(() => {
    resetSessionResolver();
  });

  it("resolves to an anonymous session when nothing is registered", async () => {
    const result = await resolveSession(new Request("http://localhost/"));
    expect(result).toEqual({ user: null, canAccessBackoffice: false });
  });

  it("delegates to the registered resolver", async () => {
    registerSessionResolver(async () => ({
      user: { id: "1", email: "admin@example.com", role: "admin" },
      canAccessBackoffice: true,
    }));

    const result = await resolveSession(new Request("http://localhost/"));
    expect(result.user?.email).toBe("admin@example.com");
    expect(result.canAccessBackoffice).toBe(true);
  });
});
