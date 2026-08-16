#!/usr/bin/env node
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATE_DIR = fileURLToPath(new URL("../src/template", import.meta.url));

interface Placeholders {
  projectName: string;
  brandName: string;
  locale: string;
  currency: string;
  timeZone: string;
}

function titleCase(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function applyPlaceholders(content: string, placeholders: Placeholders): string {
  return content.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = placeholders[key as keyof Placeholders];
    return value ?? match;
  });
}

/** `foo.astro.template` -> `foo.astro`; the one exception is `gitignore.template` -> `.gitignore`, since a literal `.gitignore` file inside this package's own source would be ignored by *this* repo's git. */
function targetFileName(templateFileName: string): string {
  if (templateFileName === "gitignore.template") return ".gitignore";
  return templateFileName.replace(/\.template$/, "");
}

async function copyTemplate(srcDir: string, destDir: string, placeholders: Placeholders) {
  await mkdir(destDir, { recursive: true });
  for (const entry of await readdir(srcDir)) {
    const srcPath = path.join(srcDir, entry);
    const info = await stat(srcPath);
    if (info.isDirectory()) {
      await copyTemplate(srcPath, path.join(destDir, entry), placeholders);
      continue;
    }
    const content = await readFile(srcPath, "utf8");
    const destPath = path.join(destDir, targetFileName(entry));
    await writeFile(destPath, applyPlaceholders(content, placeholders));
  }
}

async function main(): Promise<void> {
  const projectName = process.argv[2];
  if (!projectName) {
    console.error("Usage: create-takontuku <project-name>");
    process.exitCode = 1;
    return;
  }
  if (!/^[a-z0-9-]+$/.test(projectName)) {
    console.error("Project name must be lowercase letters, digits, and hyphens only.");
    process.exitCode = 1;
    return;
  }

  const destDir = path.resolve(process.cwd(), projectName);

  const placeholders: Placeholders = {
    projectName,
    brandName: titleCase(projectName),
    locale: "id-ID",
    currency: "IDR",
    timeZone: "Asia/Jakarta",
  };

  await copyTemplate(TEMPLATE_DIR, destDir, placeholders);

  console.log(`Created ${projectName}/`);
  console.log("");
  console.log("Next steps:");
  console.log(`  cd ${projectName}`);
  console.log("  bun install");
  console.log("  bun run cf-typegen   # generates worker-configuration.d.ts, needed for typecheck");
  console.log(
    `  wrangler d1 create ${projectName}-db   # then paste the printed UUID into wrangler.jsonc`,
  );
  console.log(`  wrangler r2 bucket create ${projectName}-media`);
  console.log("  bunx takontuku db sync");
  console.log("  wrangler d1 migrations apply DB --local");
  console.log("  bunx takontuku db seed   # optional -- populates demo data for local dev");
  console.log("  bun run dev");
  console.log("");
  console.log("Edit astro.config.mjs's brand{} to change locale/currency.");
  console.log(
    "Run `bunx takontuku add <module>` or `bunx takontuku remove <module>` to change what's installed.",
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
