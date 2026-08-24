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

interface ScreenshotEvidence {
  status: "captured" | "not-captured";
  path: string | null;
  viewport: { width: number; height: number };
  score: number | null;
}

interface ScreenshotMetadata {
  fixture: string;
  desktop: ScreenshotEvidence;
  mobile: ScreenshotEvidence;
  scoring: {
    status: "scored" | "not-scored";
    method: string;
    score: number | null;
    notes: string;
  };
}

interface Facts {
  fixture: string;
  spec: FixtureSpec;
  modules: string[];
  dependencies: string[];
  assets: string[];
  files: string[];
  screenshots: ScreenshotMetadata | null;
  findings: Finding[];
  generatedAt: string;
}

const repoRoot = path.resolve(import.meta.dir, "../..");
const requiredSkills = [
  "karsa-content",
  "karsa-data",
  "karsa-modules",
  "karsa-site-builder",
  "karsa-ui",
];
const legacyBrand = ["tako", "ntuku"].join("");
const legacyPolicyWord = ["ter", "ra"].join("");
const legacyProfileWord = ["com", "pro"].join("");
const legacyCliToken = ["--", "tk", "-"].join("");
const legacyPattern = new RegExp(
  `(?:@${legacyBrand}\\b|\\b${legacyBrand}\\b|\\b${legacyBrand}\\.|\\b${legacyPolicyWord}\\b|\\b${legacyProfileWord}\\b|${legacyCliToken})`,
  "i",
);
const textExtensionPattern = /\.(astro|ts|tsx|mjs|js|css|md|sql|json|jsonc|txt|yaml|yml)$/i;

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

function hiddenSkillFiles(root: string): string[] {
  return [".agents/skills", ".claude/skills"].flatMap((base) => {
    const directory = path.join(root, base);
    if (!existsSync(directory)) return [];
    return readdirSync(directory).flatMap((skill) => {
      const skillPath = path.join(directory, skill, "SKILL.md");
      return existsSync(skillPath) ? [path.join(base, skill, "SKILL.md")] : [];
    });
  });
}

function modulesFromConfig(source: string): string[] {
  const match = /modules:\s*\[([\s\S]*?)\]/m.exec(source);
  if (!match?.[1]) return [];
  return [...match[1].matchAll(/\b([a-z][a-z0-9-]*)\s*\(/g)].map((item) => item[1]).filter(Boolean);
}

function optionFromConfig(source: string, moduleName: string, option: string): string | undefined {
  const match = new RegExp(
    `${moduleName}\\(\\{[\\s\\S]*?\\b${option}:\\s*["']([^"']+)["']`,
    "m",
  ).exec(source);
  return match?.[1];
}

function assetFiles(root: string): string[] {
  return walk(root).filter((file) => /\.(png|jpe?g|webp|avif)$/i.test(file));
}

function sourceFiles(root: string, files: string[]): string[] {
  return [...files, ...hiddenSkillFiles(root)].filter((file) => textExtensionPattern.test(file));
}

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

function readScreenshotMetadata(root: string, fixture: string): ScreenshotMetadata | null {
  const metadata = readJson<ScreenshotMetadata>(path.join(root, "SCREENSHOT-METADATA.json"));
  if (!metadata || metadata.fixture !== fixture) return null;
  return metadata;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: capture metadata validation keeps each related invariant in one evidence pass.
function checkScreenshots(
  root: string,
  tier: FixtureSpec["tier"],
  metadata: ScreenshotMetadata | null,
  findings: Finding[],
): void {
  if (!metadata) return;

  for (const [label, evidence] of [
    ["desktop", metadata.desktop],
    ["mobile", metadata.mobile],
  ] as const) {
    if (tier === "polished" && evidence.status !== "captured")
      findings.push({
        severity: "error",
        code: `missing-${label}-capture`,
        message: `Polished fixture ${label} screenshot must be captured.`,
      });
    if (evidence.status !== "captured") continue;
    if (!evidence.path || evidence.score === null) {
      findings.push({
        severity: "error",
        code: `invalid-${label}-capture`,
        message: `Captured ${label} screenshot requires a path and score.`,
      });
      continue;
    }
    const screenshotPath = path.resolve(root, evidence.path);
    const insideFixture = path.relative(root, screenshotPath);
    if (
      insideFixture.startsWith("..") ||
      path.isAbsolute(insideFixture) ||
      !existsSync(screenshotPath)
    )
      findings.push({
        severity: "error",
        code: `missing-${label}-file`,
        message: `Captured ${label} screenshot does not resolve to a fixture-owned file.`,
        files: [evidence.path],
      });
  }

  if (
    tier === "polished" &&
    (metadata.scoring.status !== "scored" || metadata.scoring.score === null)
  )
    findings.push({
      severity: "error",
      code: "missing-visual-score",
      message: "Polished fixture screenshots must include completed visual scoring.",
    });
}

function checkSkills(root: string, findings: Finding[]): void {
  for (const base of [".agents/skills", ".claude/skills"]) {
    const directory = path.join(root, base);
    const entries = existsSync(directory) ? readdirSync(directory) : [];
    const legacy = entries.filter((entry) => new RegExp(`^${legacyBrand}(?:-|$)`, "i").test(entry));
    if (legacy.length) {
      findings.push({
        severity: "error",
        code: "legacy-skills",
        message: `Legacy framework skill directories remain in ${base}: ${legacy.join(", ")}.`,
        files: legacy.map((entry) => path.join(base, entry)),
      });
    }
    for (const skill of requiredSkills) {
      const target = path.join(directory, skill, "SKILL.md");
      const source = path.join(repoRoot, "packages/core/skills", skill, "SKILL.md");
      if (!existsSync(target)) {
        findings.push({
          severity: "error",
          code: "missing-skill",
          message: `${base}/${skill}/SKILL.md is missing.`,
        });
      } else if (
        !existsSync(source) ||
        readFileSync(target, "utf8") !== readFileSync(source, "utf8")
      ) {
        findings.push({
          severity: "error",
          code: "skill-drift",
          message: `${base}/${skill}/SKILL.md is not byte-identical to the source Karsa skill.`,
        });
      }
    }
  }
}

function checkPackageVersions(dependencies: string[], findings: Finding[]): void {
  for (const dependency of dependencies) {
    const packagePath = path.join(
      repoRoot,
      "packages",
      dependency.slice("@karsa/".length),
      "package.json",
    );
    const packageJson = readJson<{ version?: string }>(packagePath);
    if (packageJson?.version !== "0.3.0") {
      findings.push({
        severity: "error",
        code: "package-version",
        message: `${dependency} must be version 0.3.0; found ${packageJson?.version ?? "missing"}.`,
      });
    }
  }
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: this single pass intentionally evaluates the complete fixture invariant matrix.
function checkFixture(root: string, spec: FixtureSpec): Facts {
  const files = walk(root);
  const allSourceFiles = sourceFiles(root, files);
  const configPath = path.join(root, "astro.config.mjs");
  const packagePath = path.join(root, "package.json");
  const config = existsSync(configPath) ? readFileSync(configPath, "utf8") : "";
  const pkg = readJson<{ name?: string; dependencies?: Record<string, string> }>(packagePath) ?? {};
  const modules = modulesFromConfig(config);
  const dependencies = Object.keys(pkg.dependencies ?? {}).filter((name) =>
    name.startsWith("@karsa/"),
  );
  const assets = assetFiles(root);
  const findings: Finding[] = [];
  const source = allSourceFiles
    .map((file) => readFileSync(path.join(root, file), "utf8"))
    .join("\n");
  const seedSource = files
    .filter((file) => file.startsWith("seed/") && file.endsWith(".sql"))
    .map((file) => readFileSync(path.join(root, file), "utf8"))
    .join("\n");
  const brandName = /brand:\s*\{[\s\S]*?\bname:\s*["']([^"']+)["']/m.exec(config)?.[1];

  if (pkg.name !== spec.name)
    findings.push({
      severity: "error",
      code: "package-name",
      message: `Expected package name ${spec.name}; found ${pkg.name ?? "none"}.`,
    });
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
      message: "Generator runtime pin metadata is missing.",
    });
  else {
    const metadata = readJson<{
      requestedModel?: string;
      requestedReasoningEffort?: string;
      effectiveModel?: string;
      effectiveReasoningEffort?: string;
    }>(path.join(root, "RUN-METADATA.json"));
    if (
      metadata?.requestedModel !== "gpt-5.6-luna" ||
      metadata.effectiveModel !== "gpt-5.6-luna" ||
      metadata.requestedReasoningEffort !== "max" ||
      metadata.effectiveReasoningEffort !== "max"
    )
      findings.push({
        severity: "error",
        code: "run-metadata-pin",
        message: "RUN-METADATA.json must prove gpt-5.6-luna with max reasoning.",
      });
  }
  const legacyMetadataFiles = readdirSync(root).filter(
    (file) => /RUN-METADATA\.json$/i.test(file) && file !== "RUN-METADATA.json",
  );
  for (const legacyMetadata of legacyMetadataFiles) {
    if (existsSync(path.join(root, legacyMetadata)))
      findings.push({
        severity: "error",
        code: "legacy-metadata",
        message: `${legacyMetadata} is not part of the Luna Max fixture contract.`,
      });
  }
  if (!existsSync(path.join(root, "AGENTS.md")))
    findings.push({
      severity: "error",
      code: "missing-agents",
      message: "Scaffold is missing AGENTS.md.",
    });
  if (!existsSync(path.join(root, "CLAUDE.md")))
    findings.push({
      severity: "error",
      code: "missing-claude",
      message: "Scaffold is missing CLAUDE.md.",
    });
  if (!existsSync(path.join(root, "karsa.migrations.json")))
    findings.push({
      severity: "error",
      code: "missing-migration-manifest",
      message: "Scaffold is missing karsa.migrations.json.",
    });
  if (!existsSync(path.join(root, "SCREENSHOT-METADATA.json")))
    findings.push({
      severity: "error",
      code: "missing-screenshot-metadata",
      message: "Desktop/mobile screenshot and scoring metadata is missing.",
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
  if (optionFromConfig(config, "auth", "registration") !== spec.registration)
    findings.push({
      severity: "error",
      code: "auth-registration",
      message: `Expected ${spec.registration} auth registration.`,
    });
  if (
    spec.catalogPresentation &&
    optionFromConfig(config, "catalog", "presentation") !== spec.catalogPresentation
  )
    findings.push({
      severity: "error",
      code: "catalog-presentation",
      message: `Expected catalog presentation ${spec.catalogPresentation}.`,
    });
  if (
    spec.ordersPresentation &&
    optionFromConfig(config, "orders", "presentation") !== spec.ordersPresentation
  )
    findings.push({
      severity: "error",
      code: "orders-presentation",
      message: `Expected orders presentation ${spec.ordersPresentation}.`,
    });

  checkSkills(root, findings);
  checkPackageVersions(dependencies, findings);

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

  if ((spec.kind === "product" || spec.kind === "service") && spec.tier !== "install") {
    const skuRows = new Set(
      [...seedSource.matchAll(/'([A-Z][A-Z0-9]+-[A-Z0-9]+-\d{3})'/g)].map((match) => match[1]),
    );
    const itemRows =
      skuRows.size ||
      seedSource.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+catalog_items/gi)?.length ||
      0;
    if (itemRows < spec.minimumProducts && spec.kind === "product")
      findings.push({
        severity: "error",
        code: "insufficient-catalog-content",
        message: `Expected at least ${spec.minimumProducts} catalog item inserts; found ${itemRows}.`,
      });
    if (spec.kind === "service" && itemRows < spec.minimumServices)
      findings.push({
        severity: "error",
        code: "insufficient-service-content",
        message: `Expected at least ${spec.minimumServices} service rows; found ${itemRows}.`,
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
    if (!/[('"]range[)'"]/i.test(seedSource) || !/[('"]slot[)'"]/i.test(seedSource))
      findings.push({
        severity: "error",
        code: "missing-schedule-modes",
        message: "Service content must include both range and slot schedule modes.",
      });
    if (/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+inventory_item_stock/i.test(seedSource))
      findings.push({
        severity: "error",
        code: "service-inventory",
        message: "Service fixtures must not seed product inventory.",
      });
  }
  if (spec.kind === "publication" && spec.tier !== "install") {
    const postRows =
      seedSource.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+content_posts/gi)?.length ?? 0;
    const statuses = new Set(
      [...seedSource.matchAll(/'((?:draft|published|archived))'/gi)].map((match) =>
        match[1].toLowerCase(),
      ),
    );
    if (
      postRows < spec.minimumPosts ||
      statuses.size < 3 ||
      !statuses.has("draft") ||
      !statuses.has("published") ||
      !statuses.has("archived")
    )
      findings.push({
        severity: "error",
        code: "publication-content",
        message: "Publication content must seed draft, published, and archived posts.",
      });
  }

  const migrationManifest = readJson<{ nextSequence?: number }>(
    path.join(root, "karsa.migrations.json"),
  );
  const migrationNumbers = files
    .filter((file) => /^migrations\/\d+_/.test(file))
    .map((file) => Number(/^migrations\/(\d+)_/.exec(file)?.[1]));
  if (
    migrationManifest &&
    migrationNumbers.length &&
    migrationManifest.nextSequence !== Math.max(...migrationNumbers) + 1
  )
    findings.push({
      severity: "error",
      code: "migration-sequence",
      message: "karsa.migrations.json nextSequence does not follow the collected migration files.",
    });

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
  if (legacyPattern.test(source))
    findings.push({
      severity: "error",
      code: "legacy-identifiers",
      message: "Fixture contains a legacy brand, policy, or package identifier.",
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

  const screenshots = readScreenshotMetadata(root, spec.name);
  checkScreenshots(root, spec.tier, screenshots, findings);
  return {
    fixture: spec.name,
    spec,
    modules,
    dependencies,
    assets,
    files,
    screenshots,
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
  `${JSON.stringify({ fixture: facts.fixture, errors: facts.findings.filter((item) => item.severity === "error").length, warnings: facts.findings.filter((item) => item.severity === "warning").length, assets: facts.assets.length })}\n`,
);
if (facts.findings.some((item) => item.severity === "error")) process.exitCode = 1;
