import { describe, expect, it } from "vitest";
import { parseArgs } from "./args";

describe("parseArgs", () => {
  it("accepts a bare project name with no flags", () => {
    const result = parseArgs(["my-store"]);
    expect(result).toEqual({
      ok: true,
      args: { projectName: "my-store", flags: new Set(), registry: undefined },
    });
  });

  it("accepts known flags in any position", () => {
    const result = parseArgs(["--yes", "my-store", "--no-install"]);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.args.projectName).toBe("my-store");
    expect(result.args.flags).toEqual(new Set(["--yes", "--no-install"]));
  });

  it("accepts --registry with a URL, regardless of position", () => {
    const before = parseArgs(["--registry", "http://localhost:4873", "my-store"]);
    const after = parseArgs(["my-store", "--registry", "http://localhost:4873"]);
    expect(before.ok && before.args.registry).toBe("http://localhost:4873");
    expect(after.ok && after.args.registry).toBe("http://localhost:4873");
  });

  it("accepts no project name at all (the interactive path resolves it later)", () => {
    const result = parseArgs(["--yes"]);
    expect(result).toEqual({
      ok: true,
      args: { projectName: undefined, flags: new Set(["--yes"]), registry: undefined },
    });
  });

  // Regression: a mistyped flag used to be silently ignored -- `--see`
  // (meant as `--seed`) exited 0 having done nothing different.
  it("rejects an unrecognized flag instead of ignoring it", () => {
    const result = parseArgs(["my-store", "--see"]);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain("Unknown flag: --see");
  });

  // Regression: a second positional argument used to be silently dropped --
  // `create-takontuku app1 app2` scaffolded only app1.
  it("rejects a second positional argument instead of dropping it", () => {
    const result = parseArgs(["app1", "app2"]);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain("app1, app2");
  });

  it("rejects --registry with no value", () => {
    const result = parseArgs(["my-store", "--registry"]);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain("--registry needs a URL");
  });

  it("rejects --registry immediately followed by another flag", () => {
    const result = parseArgs(["--registry", "--yes", "my-store"]);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain("--registry needs a URL");
  });

  it("rejects a project name with disallowed characters", () => {
    const result = parseArgs(["My_Store!"]);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain("Project name is invalid");
  });

  it("accepts lowercase letters, digits, and hyphens", () => {
    const result = parseArgs(["my-store-123"]);
    expect(result.ok).toBe(true);
  });
});
