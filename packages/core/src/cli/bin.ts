#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ResolvedRegistry } from "../registry";
import { runSeed } from "./db-seed";
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
      `Could not load ${configPath}. Run "takontuku db sync" from your project root.\n${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const integrations = ((loaded.default?.integrations ?? []) as unknown[])
    .flat()
    .filter((integration): integration is AstroIntegrationLike => Boolean(integration));
  const takontukuIntegration = integrations.find(
    (integration) => integration.name === "@takontuku/core",
  );

  if (!takontukuIntegration?.registry) {
    throw new Error(
      `Could not find the takontuku() integration in ${configPath}. Is @takontuku/core listed in "integrations"?`,
    );
  }
  return takontukuIntegration.registry;
}

async function runDbSync(): Promise<void> {
  const cwd = process.cwd();
  const registry = await loadRegistry(cwd);
  const { written } = await syncMigrations({
    modules: registry.modules,
    lockfilePath: path.join(cwd, "takontuku.migrations.json"),
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

async function runDbSeed(): Promise<void> {
  const cwd = process.cwd();
  const registry = await loadRegistry(cwd);
  const { sqlFilesRun, mediaFilesUploaded } = await runSeed({
    cwd,
    modules: registry.modules,
    mediaPrefixes: registry.mediaPrefixes,
  });

  if (sqlFilesRun.length === 0 && mediaFilesUploaded.length === 0) {
    console.log("No seed data found.");
    return;
  }
  console.log(`Ran ${sqlFilesRun.length} seed SQL file(s):`);
  for (const entry of sqlFilesRun) console.log(`  ${entry}`);
  if (mediaFilesUploaded.length > 0) {
    console.log(`Uploaded ${mediaFilesUploaded.length} seed media file(s):`);
    for (const key of mediaFilesUploaded) console.log(`  ${key}`);
  }
}

async function main(): Promise<void> {
  const [, , command, subcommand] = process.argv;
  if (command === "db" && subcommand === "sync") {
    await runDbSync();
    return;
  }
  if (command === "db" && subcommand === "seed") {
    await runDbSeed();
    return;
  }
  console.error("Usage: takontuku db sync | takontuku db seed");
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
