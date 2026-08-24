import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const CONTENT_ROOT = path.resolve(new URL("./docs", import.meta.url).pathname);
const LOCALES = ["en", "id"] as const;
const CONTENT_EXTENSIONS = /\.(md|mdx)$/;
const legacyPackagePattern = new RegExp(
  `(?:@${["tako", "ntuku"].join("")}|@${["toko", "tuku"].join("")}|virtual:(?:${["tako", "ntuku"].join("")}|${["toko", "tuku"].join("")})|--tk-)`,
  "i",
);

function relativePages(locale: string): Set<string> {
  const pages = new Set<string>();
  const walk = (directory: string, prefix = "") => {
    for (const entry of readdirSync(directory)) {
      const absolute = path.join(directory, entry);
      if (statSync(absolute).isDirectory()) walk(absolute, path.join(prefix, entry));
      else if (CONTENT_EXTENSIONS.test(entry)) {
        const stem = entry.replace(CONTENT_EXTENSIONS, "");
        pages.add(path.join(prefix, stem === "index" ? "index" : stem));
      }
    }
  };
  walk(path.join(CONTENT_ROOT, locale));
  return pages;
}

function pageSource(locale: string, page: string): string {
  const base = path.join(CONTENT_ROOT, locale, page);
  for (const extension of [".mdx", ".md"]) {
    const candidate = `${base}${extension}`;
    try {
      return readFileSync(candidate, "utf8");
    } catch {
      // Try the other supported content extension.
    }
  }
  throw new Error(`Missing source for ${locale}/${page}`);
}

function frontmatter(source: string, page: string): { title?: string; description?: string } {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(source);
  if (!match) throw new Error(`Docs page ${page} is missing frontmatter`);
  const fields: { title?: string; description?: string } = {};
  const yaml = match[1] ?? "";
  for (const line of yaml.split("\n")) {
    const field = /^(title|description):\s*(.+?)\s*$/.exec(line);
    if (field?.[1] === "title" && field[2]) fields.title = field[2];
    if (field?.[1] === "description" && field[2]) fields.description = field[2];
  }
  return fields;
}

function checkSidebarLinks(): string[] {
  const config = readFileSync(path.resolve(CONTENT_ROOT, "../../../astro.config.mjs"), "utf8");
  const slugs = [...config.matchAll(/page\([^,]+,\s*[^,]+,\s*"([^"]*)"\)/g)].map(
    (match) => match[1] ?? "",
  );
  const pages = relativePages("en");
  return slugs
    .filter((slug) => slug.length > 0)
    .filter((slug) => !pages.has(slug))
    .map((slug) => `sidebar slug does not exist: ${slug}`);
}

function checkCoreVocabulary(): string[] {
  const errors: string[] = [];
  for (const locale of LOCALES) {
    for (const page of relativePages(locale)) {
      if (
        page.includes("migration/") ||
        page.includes("starter/commerce/") ||
        page === "guides/product"
      )
        continue;
      const source = pageSource(locale, page);
      if (/\b(store|toko|storefront)\b/i.test(source)) {
        errors.push(`${locale}/${page} uses commerce vocabulary in conceptual docs`);
      }
      if (legacyPackagePattern.test(source)) {
        errors.push(`${locale}/${page} contains a legacy identifier outside migration docs`);
      }
    }
  }
  return errors;
}

/** Ensure every English page has an Indonesian pair (and the inverse). */
export function assertDocsParity(): void {
  const pages: [Set<string>, Set<string>] = [relativePages(LOCALES[0]), relativePages(LOCALES[1])];
  const all = new Set([...pages[0], ...pages[1]]);
  const missing = LOCALES.flatMap((locale, index) =>
    [...all].filter((page) => !pages[index]?.has(page)).map((page) => `${locale}/${page}`),
  );
  const errors = missing.sort().map((page) => `missing page: ${page}`);
  for (const locale of LOCALES) {
    for (const page of pages[locale === "en" ? 0 : 1]) {
      const fields = frontmatter(pageSource(locale, page), `${locale}/${page}`);
      if (!fields.title?.trim()) errors.push(`missing title: ${locale}/${page}`);
      if (!fields.description?.trim()) errors.push(`missing description: ${locale}/${page}`);
    }
  }
  errors.push(...checkSidebarLinks(), ...checkCoreVocabulary());
  if (errors.length > 0) throw new Error(`Docs parity failed:\n${errors.join("\n")}`);
}

if (import.meta.main) assertDocsParity();
