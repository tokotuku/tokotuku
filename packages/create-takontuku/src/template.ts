import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const TEMPLATE_DIR = fileURLToPath(new URL("../src/template", import.meta.url));

export interface Placeholders {
  projectName: string;
  brandName: string;
  locale: string;
  currency: string;
  timeZone: string;
}

export function titleCase(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

export function applyPlaceholders(content: string, placeholders: Placeholders): string {
  return content.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = placeholders[key as keyof Placeholders];
    return value ?? match;
  });
}

/** `foo.astro.template` -> `foo.astro`; the one exception is `gitignore.template` -> `.gitignore`, since a literal `.gitignore` file inside this package's own source would be ignored by *this* repo's git. */
export function targetFileName(templateFileName: string): string {
  if (templateFileName === "gitignore.template") return ".gitignore";
  return templateFileName.replace(/\.template$/, "");
}

export async function copyTemplate(
  srcDir: string,
  destDir: string,
  placeholders: Placeholders,
): Promise<void> {
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
