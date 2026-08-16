import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addModule } from "./add-module";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "takontuku-add-module-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const DEFAULT_ASTRO_CONFIG = `import { auth } from "@takontuku/auth";
import { takontuku } from "@takontuku/core";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [
    takontuku({
      brand: { name: "Test", locale: "id-ID", currency: "IDR", timeZone: "Asia/Jakarta" },
      modules: [auth()],
    }),
  ],
});
`;

async function writeClient(
  options: {
    astroConfig?: string;
    middleware?: string;
    dependencies?: Record<string, string>;
  } = {},
): Promise<void> {
  await mkdir(path.join(dir, "src"), { recursive: true });
  await writeFile(path.join(dir, "astro.config.mjs"), options.astroConfig ?? DEFAULT_ASTRO_CONFIG);
  if (options.middleware !== undefined) {
    await writeFile(path.join(dir, "src", "middleware.ts"), options.middleware);
  }
  await writeFile(
    path.join(dir, "package.json"),
    JSON.stringify(
      { name: "test-client", dependencies: options.dependencies ?? { "@takontuku/core": "1.0.0" } },
      null,
      2,
    ),
  );
}

async function writeFakeModule(
  packageName: string,
  options: { hasRegister?: boolean; moduleSource: string },
): Promise<void> {
  const pkgDir = path.join(dir, "node_modules", ...packageName.split("/"));
  await mkdir(pkgDir, { recursive: true });
  const exports: Record<string, unknown> = { ".": { import: "./index.js" } };
  if (options.hasRegister) exports["./register"] = "./register.js";
  await writeFile(
    path.join(pkgDir, "package.json"),
    JSON.stringify({ name: packageName, type: "module", exports }, null, 2),
  );
  await writeFile(path.join(pkgDir, "index.js"), options.moduleSource);
  if (options.hasRegister) {
    await writeFile(path.join(pkgDir, "register.js"), "// no-op register\n");
  }
}

describe("addModule", () => {
  it("wires a module with no register export: config only, no middleware touch", async () => {
    await writeClient();
    await writeFakeModule("@takontuku/blog", {
      moduleSource: 'export function blog() { return { name: "blog", requires: [] }; }\n',
    });

    const result = await addModule({
      cwd: dir,
      packageName: "@takontuku/blog",
      versionRange: null,
      install: false,
    });

    expect(result.alreadyInstalled).toBe(false);
    expect(result.added).toEqual([
      { packageName: "@takontuku/blog", moduleName: "blog", exportName: "blog" },
    ]);
    expect(result.filesChanged.sort()).toEqual(["astro.config.mjs", "package.json"]);

    const config = await readFile(path.join(dir, "astro.config.mjs"), "utf8");
    expect(config).toContain('import { blog } from "@takontuku/blog";');
    expect(config).toContain("modules: [auth(), blog()]");

    const pkgJson = JSON.parse(await readFile(path.join(dir, "package.json"), "utf8"));
    expect(pkgJson.dependencies["@takontuku/blog"]).toBe("1.0.0");
  });

  it("adds the middleware register line when the package ships a ./register export", async () => {
    await writeClient({
      middleware: `import { defineMiddleware } from "astro:middleware";
import "@takontuku/auth/register";

export const onRequest = defineMiddleware((_context, next) => next());
`,
    });
    await writeFakeModule("@takontuku/blog", {
      hasRegister: true,
      moduleSource: 'export function blog() { return { name: "blog", requires: [] }; }\n',
    });

    const result = await addModule({
      cwd: dir,
      packageName: "@takontuku/blog",
      versionRange: null,
      install: false,
    });

    expect(result.filesChanged.sort()).toEqual(
      ["astro.config.mjs", "package.json", path.join("src", "middleware.ts")].sort(),
    );
    const middleware = await readFile(path.join(dir, "src", "middleware.ts"), "utf8");
    expect(middleware).toContain('import "@takontuku/blog/register";');
  });

  it("pulls in a required dependency transitively before wiring the requesting module", async () => {
    await writeClient();
    await writeFakeModule("@takontuku/catalog-like", {
      moduleSource:
        'export function catalogLike() { return { name: "catalog-like", requires: [] }; }\n',
    });
    await writeFakeModule("@takontuku/blog", {
      moduleSource:
        'export function blog() { return { name: "blog", requires: ["catalog-like"] }; }\n',
    });

    const result = await addModule({
      cwd: dir,
      packageName: "@takontuku/blog",
      versionRange: null,
      install: false,
    });

    expect(result.added.map((m) => m.moduleName)).toEqual(["catalog-like", "blog"]);
    const config = await readFile(path.join(dir, "astro.config.mjs"), "utf8");
    expect(config).toContain("catalogLike()");
    expect(config).toContain("blog()");
  });

  it("is idempotent when the module is already wired", async () => {
    await writeClient({
      astroConfig: DEFAULT_ASTRO_CONFIG.replace(
        'import { takontuku } from "@takontuku/core";',
        'import { blog } from "@takontuku/blog";\nimport { takontuku } from "@takontuku/core";',
      ).replace("modules: [auth()]", "modules: [auth(), blog()]"),
    });
    await writeFakeModule("@takontuku/blog", {
      moduleSource: 'export function blog() { return { name: "blog", requires: [] }; }\n',
    });

    const result = await addModule({
      cwd: dir,
      packageName: "@takontuku/blog",
      versionRange: null,
      install: false,
    });

    expect(result.alreadyInstalled).toBe(true);
    expect(result.filesChanged).toEqual([]);
  });

  it('does not claim to be "also adding" a required dependency that is already wired', async () => {
    await writeClient({
      astroConfig: DEFAULT_ASTRO_CONFIG.replace(
        'import { auth } from "@takontuku/auth";',
        'import { auth } from "@takontuku/auth";\nimport { catalogLike } from "@takontuku/catalog-like";',
      ).replace("modules: [auth()]", "modules: [auth(), catalogLike()]"),
    });
    await writeFakeModule("@takontuku/catalog-like", {
      moduleSource:
        'export function catalogLike() { return { name: "catalog-like", requires: [] }; }\n',
    });
    await writeFakeModule("@takontuku/blog", {
      moduleSource:
        'export function blog() { return { name: "blog", requires: ["catalog-like"] }; }\n',
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await addModule({
      cwd: dir,
      packageName: "@takontuku/blog",
      versionRange: null,
      install: false,
    });

    expect(logSpy.mock.calls.flat().join("\n")).not.toContain("Also adding");
    logSpy.mockRestore();
  });

  it("refuses to add core", async () => {
    await writeClient();
    await expect(
      addModule({ cwd: dir, packageName: "@takontuku/core", versionRange: null, install: false }),
    ).rejects.toThrow(/never listed in modules\[\]/);
  });
});
