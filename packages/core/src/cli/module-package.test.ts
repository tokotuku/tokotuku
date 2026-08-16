import { describe, expect, it } from "vitest";
import {
  deriveExportNameGuess,
  hasRegisterSubpath,
  normalizeModuleSpec,
  selectModuleFactory,
} from "./module-package";

describe("normalizeModuleSpec", () => {
  it("prefixes a bare name with the framework's own scope", () => {
    expect(normalizeModuleSpec("blog")).toEqual({
      packageName: "@takontuku/blog",
      versionRange: null,
    });
  });

  it("splits a bare name's trailing version range", () => {
    expect(normalizeModuleSpec("blog@1.2.0")).toEqual({
      packageName: "@takontuku/blog",
      versionRange: "1.2.0",
    });
  });

  it("leaves an already-scoped package name alone", () => {
    expect(normalizeModuleSpec("@acme/loyalty")).toEqual({
      packageName: "@acme/loyalty",
      versionRange: null,
    });
  });

  it("splits a scoped package name's trailing version range without mistaking the scope's own @ for it", () => {
    expect(normalizeModuleSpec("@takontuku/blog@1.2.0")).toEqual({
      packageName: "@takontuku/blog",
      versionRange: "1.2.0",
    });
  });
});

describe("deriveExportNameGuess", () => {
  it("camelCases a hyphenated last segment", () => {
    expect(deriveExportNameGuess("@takontuku/gift-cards")).toBe("giftCards");
  });

  it("leaves a single-word last segment as-is", () => {
    expect(deriveExportNameGuess("@takontuku/blog")).toBe("blog");
  });
});

describe("hasRegisterSubpath", () => {
  it("is true when exports declares ./register", () => {
    expect(
      hasRegisterSubpath({ exports: { ".": "./index.js", "./register": "./register.js" } }),
    ).toBe(true);
  });

  it("is false otherwise", () => {
    expect(hasRegisterSubpath({ exports: { ".": "./index.js" } })).toBe(false);
    expect(hasRegisterSubpath({})).toBe(false);
  });
});

describe("selectModuleFactory", () => {
  it("picks the camelCase-guessed export when it's a matching zero-arity function", () => {
    const namespace = { giftCards: () => ({ name: "gift-cards", requires: ["catalog"] }) };
    const result = selectModuleFactory(namespace, "@takontuku/gift-cards");
    expect(result).toEqual({
      exportName: "giftCards",
      moduleName: "gift-cards",
      requires: ["catalog"],
    });
  });

  it("falls back to the raw last segment", () => {
    const namespace = { "weird-name": undefined, blog: () => ({ name: "blog" }) };
    const result = selectModuleFactory(namespace, "@takontuku/blog");
    expect(result).toEqual({ exportName: "blog", moduleName: "blog", requires: [] });
  });

  it("scans every zero-arity export when neither guess matches, keeping the one that returns a module definition", () => {
    const namespace = {
      helperFn: () => 42,
      brokenFactory: () => {
        throw new Error("boom");
      },
      takesArgs: (x: number) => ({ name: "wrong", x }),
      blogModule: () => ({ name: "blog" }),
    };
    const result = selectModuleFactory(namespace, "@takontuku/unrelated-package-name");
    expect(result).toEqual({ exportName: "blogModule", moduleName: "blog", requires: [] });
  });

  it("refuses when no export defines a module", () => {
    const namespace = { helperFn: () => 42 };
    expect(() => selectModuleFactory(namespace, "@takontuku/blog")).toThrow(
      /Could not tell which export/,
    );
  });

  it("refuses when more than one export defines a module", () => {
    const namespace = {
      first: () => ({ name: "first" }),
      second: () => ({ name: "second" }),
    };
    expect(() => selectModuleFactory(namespace, "@takontuku/unrelated-package-name")).toThrow(
      /exports more than one module definition/,
    );
  });
});
