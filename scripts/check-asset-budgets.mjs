import { readdir, readFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const authDir = join(root, "packages/auth/src");
const uiAssetDir = join(root, "packages/ui/src/assets");

let sharp;
try {
  ({ default: sharp } = await import("sharp"));
} catch {
  const require = createRequire(import.meta.url);
  try {
    sharp = require(join(root, "node_modules/.bun/node_modules/sharp"));
  } catch {
    throw new Error("Asset budget check requires the optional sharp dependency.");
  }
}

async function metadata(file) {
  const image = sharp(file);
  const info = await image.metadata();
  if (!info.width || !info.height || !info.format) {
    throw new Error(`Cannot read dimensions for ${file}`);
  }
  return info;
}

async function assertImage(file, { maxBytes, formats, expectedWidth }) {
  const fileInfo = await stat(file);
  if (fileInfo.size > maxBytes) {
    throw new Error(`${file} is ${fileInfo.size} bytes; budget is ${maxBytes}.`);
  }
  const info = await metadata(file);
  if (!formats.includes(info.format)) {
    throw new Error(`${file} uses ${info.format}; expected ${formats.join(" or ")}.`);
  }
  if (expectedWidth !== undefined && info.width !== expectedWidth) {
    throw new Error(`${file} is ${info.width}px wide; expected ${expectedWidth}px.`);
  }
}

const authFiles = await readdir(authDir);
const expectedAuth = new Set();
for (const width of [480, 768, 1024]) {
  for (const format of ["avif", "webp"]) {
    expectedAuth.add(`auth-login-background-default-v2-${width}.${format}`);
  }
}

for (const filename of expectedAuth) {
  const file = join(authDir, filename);
  await assertImage(file, {
    maxBytes: 300_000,
    formats: [filename.endsWith(".avif") ? "heif" : "webp"],
    expectedWidth: Number(filename.match(/-(\d+)\./)?.[1]),
  });
}

const dashboardFiles = (await readdir(uiAssetDir)).filter((filename) =>
  /^admin-dashboard-(abstract|energy)-(light|dark)\.webp$/.test(filename),
);
for (const filename of dashboardFiles) {
  await assertImage(join(uiAssetDir, filename), { maxBytes: 200_000, formats: ["webp"] });
}

const mark = join(uiAssetDir, "brand/karsa/karsa-mark.svg");
const markInfo = await stat(mark);
if (markInfo.size > 20_000) throw new Error(`${mark} exceeds the 20 KB SVG budget.`);

for (const filename of authFiles) {
  if (!filename.endsWith(".astro")) continue;
  const source = await readFile(join(authDir, filename), "utf8");
  if (source.includes("auth-login-background-default-v2.png")) {
    throw new Error(`${filename} still imports the source PNG at runtime.`);
  }
}

console.log(
  `Asset budgets passed: ${expectedAuth.size} auth variants, ${dashboardFiles.length} dashboard variants, 1 SVG mark.`,
);
