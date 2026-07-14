import { afterEach, describe, expect, it, vi } from "vitest";
import { runGenerateChangelog } from "./generate-changelog.js";

describe("runGenerateChangelog", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("delegates to `bunx changeset version` and resolves on success", async () => {
    const spawn = vi.fn(() => ({ exited: Promise.resolve(0) }));
    vi.stubGlobal("Bun", { spawn });

    await runGenerateChangelog();

    expect(spawn).toHaveBeenCalledWith(
      ["bunx", "changeset", "version"],
      expect.objectContaining({ stdout: "inherit" }),
    );
  });

  it("exits with the child's exit code on failure", async () => {
    const spawn = vi.fn(() => ({ exited: Promise.resolve(1) }));
    vi.stubGlobal("Bun", { spawn });
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await runGenerateChangelog();

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});
