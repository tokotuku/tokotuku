import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyPlaceholders,
  copyTemplate,
  TEMPLATE_DIR,
  targetFileName,
  titleCase,
} from "./template";

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

describe("copyTemplate", () => {
  it("writes the AI guidance files with the selected brand name", async () => {
    const outputDir = await mkdtemp(path.join(tmpdir(), "karsa-template-"));
    try {
      await copyTemplate(TEMPLATE_DIR, outputDir, {
        projectName: "coffee-shop",
        brandName: "Kopi Pagi",
        locale: "id-ID",
        currency: "IDR",
        timeZone: "Asia/Jakarta",
        preset: "company",
      });

      await expect(readFile(path.join(outputDir, "AGENTS.md"), "utf8")).resolves.toContain(
        "# Kopi Pagi — Karsa project instructions",
      );
      await expect(readFile(path.join(outputDir, "CLAUDE.md"), "utf8")).resolves.toContain(
        "# Claude instructions for Kopi Pagi",
      );
      await expect(readFile(path.join(outputDir, "README.md"), "utf8")).resolves.toContain(
        "# Kopi Pagi",
      );
      await expect(readFile(path.join(outputDir, "README.md"), "utf8")).resolves.not.toContain(
        "{{brandName}}",
      );
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  it("renders explicit module arrays for all four presets", async () => {
    for (const preset of ["company", "product", "service", "publication"] as const) {
      const outputDir = await mkdtemp(path.join(tmpdir(), `karsa-${preset}-`));
      try {
        await copyTemplate(TEMPLATE_DIR, outputDir, {
          projectName: `${preset}-site`,
          brandName: "Karsa",
          locale: "id-ID",
          currency: "IDR",
          timeZone: "Asia/Jakarta",
          preset,
        });
        const config = await readFile(path.join(outputDir, "astro.config.mjs"), "utf8");
        expect(config).toContain(
          `registration: "${preset === "product" || preset === "service" ? "public" : "closed"}"`,
        );
        const home = await readFile(path.join(outputDir, "src/pages/index.astro"), "utf8");
        expect(home).toContain("@karsa/core/components/site/SiteHome.astro");
        const favicon = await readFile(path.join(outputDir, "public/favicon.png"));
        expect([...favicon.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
        if (preset === "service") expect(config).toContain('presentation: "inquiries"');
        if (preset === "publication") expect(config).toContain("content()");
      } finally {
        await rm(outputDir, { recursive: true, force: true });
      }
    }
  });
});
