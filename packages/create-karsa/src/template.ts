import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const TEMPLATE_DIR = fileURLToPath(new URL("../src/template", import.meta.url));

export interface Placeholders {
  projectName: string;
  brandName: string;
  locale: string;
  currency?: string | undefined;
  timeZone: string;
  preset?: PresetName;
  moduleImports?: string;
  moduleList?: string;
  currencyConfig?: string;
  presetDependencies?: string;
}

export type PresetName = "company" | "product" | "service" | "publication";
export interface PresetDefinition {
  imports: string[];
  modules: string[];
  dependencies: string[];
  requiresCurrency: boolean;
}

export const PRESETS: Record<PresetName, PresetDefinition> = {
  company: {
    imports: [],
    modules: ['auth({ registration: "closed" })', "jarene()"],
    dependencies: [],
    requiresCurrency: false,
  },
  product: {
    imports: [
      'import { catalog } from "@karsa/catalog";',
      'import { orders } from "@karsa/orders";',
    ],
    modules: [
      'auth({ registration: "public" })',
      "jarene()",
      'catalog({ presentation: "products" })',
      'orders({ presentation: "orders" })',
    ],
    dependencies: ["@karsa/catalog", "@karsa/orders"],
    requiresCurrency: true,
  },
  service: {
    imports: [
      'import { booking } from "@karsa/booking";',
      'import { catalog } from "@karsa/catalog";',
      'import { orders } from "@karsa/orders";',
    ],
    modules: [
      'auth({ registration: "public" })',
      "jarene()",
      'catalog({ presentation: "services" })',
      'orders({ presentation: "inquiries" })',
      "booking()",
    ],
    dependencies: ["@karsa/booking", "@karsa/catalog", "@karsa/orders"],
    requiresCurrency: true,
  },
  publication: {
    imports: ['import { content } from "@karsa/content";'],
    modules: ['auth({ registration: "closed" })', "jarene()", "content()"],
    dependencies: ["@karsa/content"],
    requiresCurrency: false,
  },
};

export function presetPlaceholders(placeholders: Placeholders): Placeholders {
  const presetName = placeholders.preset ?? "company";
  const preset = PRESETS[presetName];
  const moduleImports = [
    'import { auth } from "@karsa/auth";',
    ...preset.imports,
    'import { karsa } from "@karsa/core";',
    'import { jarene } from "@karsa/jarene";',
  ].sort((left, right) => {
    const leftSpecifier = left.match(/from "([^"]+)"/)?.[1] ?? left;
    const rightSpecifier = right.match(/from "([^"]+)"/)?.[1] ?? right;
    return leftSpecifier.localeCompare(rightSpecifier);
  });
  return {
    ...placeholders,
    preset: presetName,
    moduleImports: moduleImports.join("\n"),
    moduleList: preset.modules.join(", "),
    currencyConfig: preset.requiresCurrency
      ? `        currency: "${placeholders.currency ?? "IDR"}",\n`
      : "",
    presetDependencies: preset.dependencies.map((name) => `    "${name}": "latest",`).join("\n"),
  };
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
  const resolvedPlaceholders = presetPlaceholders(placeholders);
  await mkdir(destDir, { recursive: true });
  for (const entry of await readdir(srcDir)) {
    const srcPath = path.join(srcDir, entry);
    const info = await stat(srcPath);
    if (info.isDirectory()) {
      await copyTemplate(srcPath, path.join(destDir, entry), resolvedPlaceholders);
      continue;
    }
    const content = await readFile(srcPath, "utf8");
    const destPath = path.join(destDir, targetFileName(entry));
    await writeFile(destPath, applyPlaceholders(content, resolvedPlaceholders));
  }
}
