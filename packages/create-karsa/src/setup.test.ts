import { describe, expect, it } from "vitest";
import { noteworthyLines, trim } from "./setup";

describe("trim", () => {
  it("returns short output unchanged", () => {
    expect(trim("line one\nline two", 5)).toBe("line one\nline two");
  });

  it("truncates and appends a count of the remaining lines", () => {
    const output = Array.from({ length: 10 }, (_, i) => `line ${i}`).join("\n");
    const result = trim(output, 3);
    expect(result.split("\n")).toEqual(["line 0", "line 1", "line 2", "… 7 more line(s)"]);
  });
});

describe("noteworthyLines", () => {
  // These are exactly the lines bun/npm/wrangler write to stderr during a
  // normal, successful run -- reporting them as "something to look at"
  // trains you to ignore the section that actually matters.
  it("filters out routine tool chatter", () => {
    const stderr = [
      "Resolving dependencies",
      "Resolved, downloaded and extracted [321]",
      "Saved lockfile",
      "$ wrangler types",
      "⛅️ wrangler 4.123.0",
    ].join("\n");
    expect(noteworthyLines(stderr)).toBe("");
  });

  it("surfaces deprecation, vulnerability, and engine warnings", () => {
    const lines = [
      "npm warn deprecated inflight@1.0.6: This module is not supported",
      "npm WARN EBADENGINE Unsupported engine",
      "3 moderate severity vulnerabilities",
      "npm warn ERESOLVE overriding peer dependency",
    ];
    for (const line of lines) {
      expect(noteworthyLines(line)).toBe(line);
    }
  });

  it("keeps only the noteworthy lines out of a mixed stream", () => {
    const stderr = [
      "Resolving dependencies",
      "npm warn deprecated foo@1.0.0",
      "Saved lockfile",
    ].join("\n");
    expect(noteworthyLines(stderr)).toBe("npm warn deprecated foo@1.0.0");
  });
});
