import { describe, expect, it, vi } from "vitest";
import { notImplemented } from "./not-implemented.js";

describe("notImplemented", () => {
  it("logs a message naming the command and exits with a non-zero code", () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    notImplemented("create component");

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("create component"));
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
