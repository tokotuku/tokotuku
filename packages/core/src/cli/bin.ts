#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ResolvedRegistry } from "../registry";
import { addModule } from "./add-module";
import { runSeed } from "./db-seed";
import { syncMigrations } from "./db-sync";
import { normalizeModuleSpec } from "./module-package";
import { removeModule } from "./remove-module";

interface AstroIntegrationLike {
  name?: string;
  registry?: ResolvedRegistry;
}

async function loadRegistry(
  cwd: string,
  options: { fresh?: boolean } = {},
): Promise<ResolvedRegistry> {
  const configPath = path.join(cwd, "astro.config.mjs");
  const href = pathToFileURL(configPath).href;
  let loaded: { default?: { integrations?: unknown } };
  try {
    loaded = await import(options.fresh ? `${href}?t=${Date.now()}` : href);
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

async function runDbSync(cwd: string, registry: ResolvedRegistry): Promise<void> {
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

function parseArgs(args: string[]): { positional: string[]; flags: Set<string> } {
  const positional: string[] = [];
  const flags = new Set<string>();
  for (const arg of args) {
    if (arg.startsWith("--")) flags.add(arg);
    else positional.push(arg);
  }
  return { positional, flags };
}

async function runAdd(args: string[]): Promise<void> {
  const { positional, flags } = parseArgs(args);
  const spec = positional[0];
  if (!spec) {
    console.error("Usage: takontuku add <module> [--no-install] [--no-sync]");
    process.exitCode = 1;
    return;
  }

  const cwd = process.cwd();
  const { packageName, versionRange } = normalizeModuleSpec(spec);
  const result = await addModule({
    cwd,
    packageName,
    versionRange,
    install: !flags.has("--no-install"),
  });

  if (result.alreadyInstalled) {
    console.log(`${packageName} is already installed. Nothing to do.`);
    return;
  }

  console.log(`Updated ${result.filesChanged.join(", ")}.`);
  if (!flags.has("--no-sync")) {
    const registry = await loadRegistry(cwd, { fresh: true });
    await runDbSync(cwd, registry);
  }
}

async function runRemove(args: string[]): Promise<void> {
  const { positional, flags } = parseArgs(args);
  const spec = positional[0];
  if (!spec) {
    console.error("Usage: takontuku remove <module> [--no-install]");
    process.exitCode = 1;
    return;
  }

  const cwd = process.cwd();
  const { packageName } = normalizeModuleSpec(spec);
  const registry = await loadRegistry(cwd);
  const moduleName = packageName.split("/").pop() as string;
  const result = await removeModule({
    cwd,
    packageName,
    moduleName,
    install: !flags.has("--no-install"),
    registry,
  });

  if (result.notInstalled) {
    console.log(`${packageName} is not installed. Nothing to do.`);
    return;
  }

  console.log(`Updated ${result.filesChanged.join(", ")}.`);
  console.log(
    'Left migrations/ and takontuku.migrations.json alone — already-applied migrations are never rewritten, and the lockfile entry is what keeps a later "takontuku add" from re-emitting them. Drop the module\'s tables with your own migration if you want the data gone.',
  );
}

async function main(): Promise<void> {
  const [, , command, ...rest] = process.argv;
  if (command === "db" && rest[0] === "sync") {
    const cwd = process.cwd();
    await runDbSync(cwd, await loadRegistry(cwd));
    return;
  }
  if (command === "db" && rest[0] === "seed") {
    await runDbSeed();
    return;
  }
  if (command === "add") {
    await runAdd(rest);
    return;
  }
  if (command === "remove") {
    await runRemove(rest);
    return;
  }
  console.error(
    "Usage: takontuku add <module> | takontuku remove <module> | takontuku db sync | takontuku db seed",
  );
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
