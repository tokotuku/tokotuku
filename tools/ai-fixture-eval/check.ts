#!/usr/bin/env bun
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { type FixtureSpec, fixtureSpec } from "./matrix";

interface Finding {
  severity: "error" | "warning";
  code: string;
  message: string;
  files?: string[];
}
interface Facts {
  fixture: string;
  spec: FixtureSpec;
  modules: string[];
  dependencies: string[];
  assets: string[];
  files: string[];
  findings: Finding[];
  generatedAt: string;
}

function walk(root: string, relative = ""): string[] {
  const dir = path.join(root, relative);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    if (
      [
        "node_modules",
        ".astro",
        ".wrangler",
        ".git",
        ".agents",
        ".claude",
        "dist",
        "graphify-out",
      ].includes(entry)
    )
      return [];
    const next = path.join(relative, entry);
    return statSync(path.join(root, next)).isDirectory() ? walk(root, next) : [next];
  });
}

function modulesFromConfig(source: string): string[] {
  const match = /modules:\s*\[([\s\S]*?)\]/m.exec(source);
  if (!match?.[1]) return [];
  return [...match[1].matchAll(/\b([a-z][a-z0-9-]*)\(\)/g)].map((item) => item[1]).filter(Boolean);
}

function assetFiles(root: string): string[] {
  return walk(root).filter(
    (file) => /\.(png|jpe?g|webp|avif)$/i.test(file) && !file.includes("node_modules"),
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: this single pass intentionally evaluates the complete fixture invariant matrix.
function checkFixture(root: string, spec: FixtureSpec): Facts {
  const files = walk(root);
  const config = readFileSync(path.join(root, "astro.config.mjs"), "utf8");
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
  };
  const modules = modulesFromConfig(config);
  const dependencies = Object.keys(pkg.dependencies ?? {}).filter((name) =>
    name.startsWith("@takontuku/"),
  );
  const assets = assetFiles(root);
  const findings: Finding[] = [];
  const brandName = /brand:\s*\{[\s\S]*?\bname:\s*["']([^"']+)["']/m.exec(config)?.[1];
  if (brandName !== spec.brand)
    findings.push({
      severity: "error",
      code: "brand-mapping",
      message: `Expected brand ${spec.brand}; found ${brandName ?? "none"}.`,
    });
  if (!existsSync(path.join(root, "RUN-METADATA.json")))
    findings.push({
      severity: "error",
      code: "missing-run-metadata",
      message: "Effective model/reasoning pin is unproven; mutation must not be accepted.",
    });
  const expected = [...spec.expectedModules].sort();
  // jarene is an optional auth-panel module included by the public scaffold;
  // the matrix asserts the business modules and treats jarene as baseline.
  const actual = modules.filter((module) => module !== "jarene").sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual))
    findings.push({
      severity: "error",
      code: "module-set",
      message: `Expected modules ${expected.join(", ")}; found ${actual.join(", ")}.`,
    });
  if (!existsSync(path.join(root, "AGENTS.md")))
    findings.push({
      severity: "error",
      code: "missing-agents",
      message: "Scaffold is missing AGENTS.md.",
    });
  if (!existsSync(path.join(root, ".agents/skills/takontuku-store-builder/SKILL.md")))
    findings.push({
      severity: "error",
      code: "missing-skills",
      message: "Takontuku skills are not installed.",
    });
  if (spec.tier !== "polished" && assets.length > spec.minimumAssets)
    findings.push({
      severity: "error",
      code: "unexpected-assets",
      message: `${spec.tier} fixture contains custom raster assets.`,
      files: assets,
    });
  if (spec.tier === "polished" && assets.length < spec.minimumAssets)
    findings.push({
      severity: "error",
      code: "too-few-assets",
      message: `Expected at least ${spec.minimumAssets} local raster assets; found ${assets.length}.`,
      files: assets,
    });
  if (spec.tier === "polished" && !existsSync(path.join(root, "DESIGN.md")))
    findings.push({
      severity: "error",
      code: "missing-design-manifest",
      message: "Polished fixture is missing DESIGN.md asset/palette manifest.",
    });
  const sourceFiles = files.filter((file) => /\.(astro|ts|mjs|css|md|sql|jsonc?)$/.test(file));
  const source = sourceFiles.map((file) => readFileSync(path.join(root, file), "utf8")).join("\n");
  const seedSource = files
    .filter((file) => file.startsWith("seed/") && file.endsWith(".sql"))
    .map((file) => readFileSync(path.join(root, file), "utf8"))
    .join("\n");
  if ((spec.kind === "product" || spec.kind === "service") && spec.tier !== "install") {
    const skuRows = new Set(
      [...seedSource.matchAll(/'([A-Z][A-Z0-9]+-[A-Z0-9]+-\d{3})'/g)].map((match) => match[1]),
    );
    const itemRows =
      skuRows.size ||
      seedSource.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+catalog_items/gi)?.length ||
      0;
    if (itemRows < spec.minimumProducts)
      findings.push({
        severity: "error",
        code: "insufficient-catalog-content",
        message: `Expected at least ${spec.minimumProducts} catalog item inserts; found ${itemRows}.`,
      });
  }
  if (spec.kind === "product" && spec.tier !== "install") {
    const inventoryRows =
      seedSource.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+inventory_item_stock/gi)?.length ?? 0;
    if (inventoryRows < spec.minimumProducts)
      findings.push({
        severity: "error",
        code: "insufficient-inventory-content",
        message: `Expected inventory for ${spec.minimumProducts} products; found ${inventoryRows} inserts.`,
      });
  }
  if (spec.kind === "service" && spec.tier !== "install") {
    const scheduleRows =
      seedSource.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+booking_item_schedule/gi)?.length ?? 0;
    if (scheduleRows < spec.minimumServices)
      findings.push({
        severity: "error",
        code: "insufficient-booking-content",
        message: `Expected schedules for ${spec.minimumServices} services; found ${scheduleRows} inserts.`,
      });
    if (!/[('\\"]range[)'\\"]/i.test(seedSource) || !/[('\\"]slot[)'\\"]/i.test(seedSource))
      findings.push({
        severity: "error",
        code: "missing-schedule-modes",
        message: "Service content must include both range and slot schedule modes.",
      });
  }
  const externalImages = [
    ...source.matchAll(/https?:\/\/[^\s"')]+\.(?:png|jpe?g|webp|avif)/gi),
  ].map((match) => match[0]);
  if (externalImages.length > 0)
    findings.push({
      severity: "error",
      code: "external-assets",
      message: "Fixture references external raster assets.",
      files: externalImages,
    });
  if (
    spec.tier === "install" &&
    (existsSync(path.join(root, "seed")) || existsSync(path.join(root, "src/theme")))
  )
    findings.push({
      severity: "error",
      code: "install-scope",
      message: "Install-only fixture contains seed or theme customization.",
    });
  if (spec.tier === "content" && existsSync(path.join(root, "src/theme")))
    findings.push({
      severity: "error",
      code: "content-scope",
      message: "Content fixture contains theme customization.",
    });
  return {
    fixture: spec.name,
    spec,
    modules,
    dependencies,
    assets,
    files,
    findings,
    generatedAt: new Date().toISOString(),
  };
}

const fixture = process.argv[2];
if (!fixture) throw new Error("Usage: bun tools/ai-fixture-eval/check.ts <fixture-path>");
const root = path.resolve(fixture);
const spec = fixtureSpec(path.basename(root));
const facts = checkFixture(root, spec);
writeFileSync(path.join(root, "FACTS.json"), `${JSON.stringify(facts, null, 2)}\n`);
for (const finding of facts.findings)
  console.error(`${finding.severity.toUpperCase()} ${finding.code}: ${finding.message}`);
process.stdout.write(
  `${JSON.stringify({
    fixture: facts.fixture,
    errors: facts.findings.filter((item) => item.severity === "error").length,
    warnings: facts.findings.filter((item) => item.severity === "warning").length,
    assets: facts.assets.length,
  })}\n`,
);
if (facts.findings.some((item) => item.severity === "error")) process.exitCode = 1;
