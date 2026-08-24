#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { log, outro } from "@clack/prompts";
import { parseArgs } from "./args";
import { printFailures, printFooter, printManualSteps, printWarnings } from "./report";
import { runSetup } from "./setup";
import { copyTemplate, TEMPLATE_DIR } from "./template";
import { defaultAnswers, runWizard } from "./wizard";

async function writeGeneratedFiles(destDir: string, registry: string | undefined): Promise<void> {
  // @karsa/auth passes this straight to better-auth with no fallback, so
  // a scaffold without it can't serve a single authenticated request. It's
  // gitignored, per-project, and has no reason to be chosen by hand.
  await writeFile(
    path.join(destDir, ".dev.vars"),
    `BETTER_AUTH_SECRET=${randomBytes(32).toString("base64url")}\n`,
  );

  // A scoped .npmrc, only when asked for: the default scaffold resolves
  // everything from public npm, and writing a registry line unconditionally
  // is how a lockfile ends up pinned to a registry that only exists on one
  // machine.
  if (registry) {
    await writeFile(path.join(destDir, ".npmrc"), `@karsa:registry=${registry}\n`);
  }
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(parsed.error);
    process.exitCode = 1;
    return;
  }
  const { projectName: given, flags, registry, preset } = parsed.args;

  // Prompting requires both a real terminal to read from and permission to
  // use it: CI, the e2e gates, and `--yes` all take the flags-and-defaults
  // path instead, so this never blocks a script waiting on input.
  const interactive = Boolean(process.stdin.isTTY) && !flags.has("--yes");
  const noInstall = flags.has("--no-install");
  if (!interactive && !given) {
    console.error(
      "Usage: create-karsa <project-name> [--preset company|product|service|publication] [--yes] [--no-install] [--seed]",
    );
    console.error("       [--registry <url>]   resolve @karsa/* from a custom registry");
    process.exitCode = 1;
    return;
  }

  const answers = interactive
    ? await runWizard(given, noInstall, preset)
    : defaultAnswers(given as string, noInstall, preset);

  const destDir = path.resolve(process.cwd(), answers.projectName);
  await copyTemplate(TEMPLATE_DIR, destDir, {
    projectName: answers.projectName,
    brandName: answers.brandName,
    locale: answers.locale,
    ...(answers.currency ? { currency: answers.currency } : {}),
    timeZone: answers.timeZone,
    preset: answers.preset,
  });
  await writeGeneratedFiles(destDir, registry);

  if (!interactive) console.log(`Created ${answers.projectName}/`);

  const seed = flags.has("--seed");
  if (!answers.install) {
    if (interactive) outro(`Created ${answers.projectName}/`);
    printManualSteps(answers.projectName, answers.manager);
    return;
  }

  const { failures, warnings } = runSetup({
    destDir,
    manager: answers.manager,
    seed,
    gitInit: answers.gitInit,
    interactive,
  });

  printWarnings(warnings);
  if (failures.length > 0) printFailures(answers.projectName, failures);
  else log.success(`cd ${answers.projectName} && ${answers.manager} run dev`);
  printFooter(answers.projectName, seed);
  if (interactive) outro("Happy building.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
