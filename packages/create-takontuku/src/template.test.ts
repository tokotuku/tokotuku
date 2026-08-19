import { describe, expect, it } from "vitest";
import { applyPlaceholders, targetFileName, titleCase } from "./template";

describe("titleCase", () => {
  it("capitalizes each hyphen-separated word", () => {
    expect(titleCase("pawfect-pet-care")).toBe("Pawfect Pet Care");
  });

  it("handles a single word", () => {
    expect(titleCase("pawfect")).toBe("Pawfect");
  });

  it("collapses underscores and repeated separators", () => {
    expect(titleCase("my__store--name")).toBe("My Store Name");
  });
});

describe("applyPlaceholders", () => {
  const placeholders = {
    projectName: "pawfect",
    brandName: "Pawfect",
    locale: "id-ID",
    currency: "IDR",
    timeZone: "Asia/Jakarta",
  };

  it("substitutes every known placeholder", () => {
    const result = applyPlaceholders(
      '{"name": "{{projectName}}", "locale": "{{locale}}"}',
      placeholders,
    );
    expect(result).toBe('{"name": "pawfect", "locale": "id-ID"}');
  });

  it("leaves an unknown placeholder untouched rather than substituting garbage", () => {
    const result = applyPlaceholders("{{notARealField}}", placeholders);
    expect(result).toBe("{{notARealField}}");
  });
});

describe("targetFileName", () => {
  it("strips the .template suffix", () => {
    expect(targetFileName("astro.config.mjs.template")).toBe("astro.config.mjs");
  });

  it("maps gitignore.template to a literal .gitignore", () => {
    // Not just suffix-stripping: gitignore.template -> gitignore would
    // produce a file this repo's own git would silently ignore.
    expect(targetFileName("gitignore.template")).toBe(".gitignore");
  });

  it("leaves a file without the suffix unchanged", () => {
    expect(targetFileName("README.md")).toBe("README.md");
  });
});
