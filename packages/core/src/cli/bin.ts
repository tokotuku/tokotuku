#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ResolvedRegistry } from "../registry";
import { syncMigrations } from "./db-sync";

interface AstroIntegrationLike {
  name?: string;
  registry?: ResolvedRegistry;
}

async function loadRegistry(cwd: string): Promise<ResolvedRegistry> {
  const configPath = path.join(cwd, "astro.config.mjs");
  let loaded: { default?: { integrations?: unknown } };
  try {
    loaded = await import(pathToFileURL(configPath).href);
  } catch (error) {
    throw new Error(
      `Could not load ${configPath}. Run "tokotuku db sync" from your project root.\n${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const integrations = ((loaded.default?.integrations ?? []) as unknown[])
    .flat()
    .filter((integration): integration is AstroIntegrationLike => Boolean(integration));
  const tokotukuIntegration = integrations.find(
    (integration) => integration.name === "@tokotuku/core",
  );

  if (!tokotukuIntegration?.registry) {
    throw new Error(
      `Could not find the tokotuku() integration in ${configPath}. Is @tokotuku/core listed in "integrations"?`,
    );
  }
  return tokotukuIntegration.registry;
}

async function runDbSync(): Promise<void> {
  const cwd = process.cwd();
  const registry = await loadRegistry(cwd);
  const { written } = await syncMigrations({
    modules: registry.modules,
    lockfilePath: path.join(cwd, "tokotuku.migrations.json"),
    migrationsDir: path.join(cwd, "migrations"),
  });

  if (written.length === 0) {
    console.log("Already up to date — no new migrations to sync.");
    return;
  }
  console.log(`Wrote ${written.length} migration file(s):`);
  for (const fileName of written) console.log(`  migrations/${fileName}`);
  console.log('Review the diff, then run "wrangler d1 migrations apply DB" as usual.');
}

async function main(): Promise<void> {
  const [, , command, subcommand] = process.argv;
  if (command === "db" && subcommand === "sync") {
    await runDbSync();
    return;
  }
  console.error("Usage: tokotuku db sync");
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
