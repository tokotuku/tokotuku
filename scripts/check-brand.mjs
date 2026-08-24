import { readdir, readFile, stat } from "node:fs/promises";
import { relative, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const oldBrand = new RegExp([["tako", "ntuku"].join(""), ["toko", "tuku"].join("")].join("|"), "i");
const allowed = [
  /^MIGRATION-0\.2\.md$/,
  /^apps\/docs\/src\/content\/docs\/(en|id)\/migration\/0-2-to-0-3\.mdx$/,
];
const skippedDirectories = new Set([
  ".git",
  "node_modules",
  "dist",
  ".astro",
  ".wrangler",
  "graphify-out",
  ".moon",
  ".pnpm-store",
  "storybook-static",
]);
const skippedFiles = new Set([".claude/settings.local.json"]);
const errors = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
    if (entry.isSymbolicLink()) continue;
    const absolute = resolve(directory, entry.name);
    const path = relative(root, absolute);
    if (skippedFiles.has(path)) continue;
    if (oldBrand.test(entry.name) && !allowed.some((pattern) => pattern.test(path)))
      errors.push(`${path}: legacy identifier in path`);
    if (entry.isDirectory()) await walk(absolute);
    else {
      let info;
      try {
        info = await stat(absolute);
      } catch {
        // Workspace package managers can remove a linked store entry while a
        // scan is in progress. A vanished path cannot contain a legacy token.
        continue;
      }
      if (info.size > 2_000_000 || /\.(png|jpe?g|webp|avif|woff2?|ico)$/i.test(entry.name))
        continue;
      const source = await readFile(absolute, "utf8");
      if (oldBrand.test(source) && !allowed.some((pattern) => pattern.test(path)))
        errors.push(`${path}: legacy identifier in content`);
    }
  }
}

await walk(root);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("Karsa brand cutover check passed.");
