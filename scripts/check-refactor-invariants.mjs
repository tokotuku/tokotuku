import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const errors = [];
const require = createRequire(import.meta.url);
function requireWorkspaceDependency(name) {
  try {
    return require(name);
  } catch {
    return require(join(root, "node_modules/.bun/node_modules", name));
  }
}

const parser = requireWorkspaceDependency("@babel/parser");
const astroCompiler = requireWorkspaceDependency("@astrojs/compiler");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (["node_modules", "dist", ".astro"].includes(entry.name)) continue;
    const file = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(file)));
    else files.push(file);
  }
  return files;
}

function hasNestedConditional(ast) {
  let nested = false;
  function containsConditional(node) {
    if (!node || typeof node !== "object") return false;
    if (node.type === "ConditionalExpression") return true;
    return Object.values(node).some((value) => {
      if (Array.isArray(value)) return value.some(containsConditional);
      return value && typeof value === "object" && containsConditional(value);
    });
  }
  function visit(node) {
    if (!node || typeof node !== "object" || nested) return;
    if (
      node.type === "ConditionalExpression" &&
      (containsConditional(node.consequent) || containsConditional(node.alternate))
    ) {
      nested = true;
      return;
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object") visit(value);
    }
  }
  visit(ast);
  return nested;
}

function checkJavaScript(text, file) {
  try {
    const ast = parser.parse(text, {
      sourceType: "unambiguous",
      plugins: ["typescript", "jsx"],
    });
    if (hasNestedConditional(ast)) errors.push(`${file}: nested ternary`);
  } catch {
    // The Astro compiler owns template syntax; an individual embedded expression
    // can be skipped here when it is not a standalone JavaScript program.
  }
}

async function checkAstro(file, source) {
  const { ast } = await astroCompiler.parse(source);
  const snippets = [ast.children.find((child) => child.type === "frontmatter")?.value];
  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (node.type === "attribute" && node.kind === "expression" && typeof node.value === "string") {
      snippets.push(node.value);
    }
    if (node.type === "expression") {
      for (const child of node.children ?? []) {
        if (child.type === "text") snippets.push(child.value);
      }
    }
    if (node.type === "script") {
      for (const child of node.children ?? []) {
        if (child.type === "text") snippets.push(child.value);
      }
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object") visit(value);
    }
  }
  visit(ast);
  for (const snippet of snippets.filter(Boolean)) checkJavaScript(snippet, file);
}

const scopedFiles = [
  ...(await walk(join(root, "packages"))),
  ...(await walk(join(root, "apps/docs"))),
];
for (const file of scopedFiles) {
  const source = await readFile(file, "utf8");
  if (file.includes("/src/routes/") && !/\.(?:astro|ts)$/.test(file)) {
    errors.push(`${file}: routes/** may only contain Astro pages or API TypeScript`);
  }
  if (/\.astro$/.test(file)) {
    if (/<style\b/i.test(source)) errors.push(`${file}: inline <style> block`);
    await checkAstro(file, source);
  } else if (/\.(?:ts|tsx|js|jsx)$/.test(file)) {
    checkJavaScript(source, file);
  }
  if (/apps\/(?:example|storybook)/.test(source)) {
    errors.push(`${file}: hardcoded example/Storybook source reference`);
  }
  if (/\bclass(?:Name)?\s*=\s*\{[`"](?:[^}]|}(?!\s*\}))*\$\{/.test(source)) {
    errors.push(`${file}: interpolated class; use a complete class mapping`);
  }
  if (/class:list\s*=\s*\{[^}\n]*\+\s*[A-Za-z_$][\w$]*[^}\n]*\}/.test(source)) {
    errors.push(`${file}: concatenated class; use a complete class mapping`);
  }
  if (/(?:className|class)\s*=\s*["'`][^"'`]*--["'`]\s*\+/.test(source)) {
    errors.push(`${file}: concatenated modifier class; use a complete class mapping`);
  }
}

for (const entry of await readdir(join(root, "packages"), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const packageDir = join(root, "packages", entry.name);
  const packageFiles = await walk(packageDir);
  if (!packageFiles.some((file) => file.endsWith(".test.ts"))) continue;
  const moon = await readFile(join(packageDir, "moon.yml"), "utf8");
  if (!/^\s{2}test:\s*$/m.test(moon))
    errors.push(`${packageDir}: test files require a Moon test task`);
}

try {
  const changedExamples = execFileSync("git", ["diff", "--name-only", "--", "examples"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  if (changedExamples) errors.push(`examples/** changed:\n${changedExamples}`);
} catch (error) {
  errors.push(`cannot inspect examples diff: ${error.message}`);
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
process.stdout.write(
  `Refactor invariants passed for ${scopedFiles.length} files; examples/** unchanged.\n`,
);
