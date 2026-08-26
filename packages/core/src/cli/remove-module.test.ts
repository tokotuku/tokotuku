import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ResolvedRegistry } from "../registry";
import { removeModule } from "./remove-module";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "karsa-remove-module-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function emptyRegistry(overrides: Partial<ResolvedRegistry> = {}): ResolvedRegistry {
  return {
    moduleNames: [],
    guardedPrefixes: [],
    mediaPrefixes: [],
    adminNav: [],
    siteRoutes: [],
    adminRoutes: [],
    ambientScripts: [],
    siteHomeSections: [],
    adminDashboardWidgets: [],
    authPanelWidgets: [],
    clientConfig: {},
    requiredBrandFields: [],
    sitemapSources: [],
    modules: [],
    ...overrides,
  };
}

const WIRED_ASTRO_CONFIG = `import { auth } from "@karsa/auth";
import { blog } from "@karsa/blog";
import { karsa } from "@karsa/core";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [
    karsa({
      brand: { name: "Test", locale: "id-ID", currency: "IDR", timeZone: "Asia/Jakarta" },
      modules: [auth(), blog()],
    }),
  ],
});
`;

const WIRED_MIDDLEWARE = `import { defineMiddleware } from "astro:middleware";
import "@karsa/auth/register";
import "@karsa/blog/register";

export const onRequest = defineMiddleware((_context, next) => next());
`;

async function writeWiredClient(): Promise<void> {
  await mkdir(path.join(dir, "src"), { recursive: true });
  await mkdir(path.join(dir, "migrations"), { recursive: true });
  await writeFile(path.join(dir, "astro.config.mjs"), WIRED_ASTRO_CONFIG);
  await writeFile(path.join(dir, "src", "middleware.ts"), WIRED_MIDDLEWARE);
  await writeFile(
    path.join(dir, "package.json"),
    JSON.stringify(
      {
        name: "test-client",
        dependencies: { "@karsa/core": "1.0.0", "@karsa/blog": "1.0.0" },
      },
      null,
      2,
    ),
  );
  await writeFile(path.join(dir, "migrations", "0000_blog_init.sql"), "-- blog init\n");
  await writeFile(
    path.join(dir, "karsa.migrations.json"),
    JSON.stringify({ nextSequence: 1, modules: { blog: 1 } }, null, 2),
  );
}

describe("removeModule", () => {
  it("removes the config import/entry and middleware register line, leaving migrations and the lockfile byte-identical", async () => {
    await writeWiredClient();
    const migrationBefore = await readFile(
      path.join(dir, "migrations", "0000_blog_init.sql"),
      "utf8",
    );
    const lockfileBefore = await readFile(path.join(dir, "karsa.migrations.json"), "utf8");

    const registry = emptyRegistry({
      moduleNames: ["core", "auth", "blog"],
      modules: [
        { name: "auth", requires: [], migrations: [], seeds: [] },
        { name: "blog", requires: [], migrations: [], seeds: [] },
      ],
    });

    const result = await removeModule({
      cwd: dir,
      packageName: "@karsa/blog",
      moduleName: "blog",
      install: false,
      registry,
    });

    expect(result.notInstalled).toBe(false);
    expect(result.filesChanged.sort()).toEqual([
      "astro.config.mjs",
      path.join("src", "middleware.ts"),
    ]);

    const config = await readFile(path.join(dir, "astro.config.mjs"), "utf8");
    expect(config).not.toContain("@karsa/blog");
    expect(config).toContain("modules: [auth()]");

    const middleware = await readFile(path.join(dir, "src", "middleware.ts"), "utf8");
    expect(middleware).not.toContain("@karsa/blog");
    expect(middleware).toContain("@karsa/auth/register");

    // package.json untouched since install: false.
    const pkgJson = JSON.parse(await readFile(path.join(dir, "package.json"), "utf8"));
    expect(pkgJson.dependencies["@karsa/blog"]).toBe("1.0.0");

    const migrationAfter = await readFile(
      path.join(dir, "migrations", "0000_blog_init.sql"),
      "utf8",
    );
    const lockfileAfter = await readFile(path.join(dir, "karsa.migrations.json"), "utf8");
    expect(migrationAfter).toBe(migrationBefore);
    expect(lockfileAfter).toBe(lockfileBefore);
  });

  it("refuses when another installed module still requires it", async () => {
    await writeWiredClient();
    const registry = emptyRegistry({
      moduleNames: ["core", "catalog", "orders"],
      modules: [
        { name: "catalog", requires: [], migrations: [], seeds: [] },
        { name: "orders", requires: ["catalog"], migrations: [], seeds: [] },
      ],
    });

    await expect(
      removeModule({
        cwd: dir,
        packageName: "@karsa/catalog",
        moduleName: "catalog",
        install: false,
        registry,
      }),
    ).rejects.toThrow(/"orders" requires "catalog"/);
  });

  it("is a no-op when the module isn't installed", async () => {
    await writeWiredClient();
    const registry = emptyRegistry({ moduleNames: ["core", "auth", "blog"] });

    const result = await removeModule({
      cwd: dir,
      packageName: "@karsa/orders",
      moduleName: "orders",
      install: false,
      registry,
    });

    expect(result.notInstalled).toBe(true);
    expect(result.filesChanged).toEqual([]);
  });

  it("refuses to remove core", async () => {
    await writeWiredClient();
    await expect(
      removeModule({
        cwd: dir,
        packageName: "@karsa/core",
        moduleName: "core",
        install: false,
        registry: emptyRegistry(),
      }),
    ).rejects.toThrow(/never listed in modules\[\]/);
  });
});
