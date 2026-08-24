import { log } from "@clack/prompts";
import type { PackageManager } from "./environment";
import type { StepFailure } from "./setup";

export function manualSetupSteps(projectName: string, manager: PackageManager): string[] {
  return [
    `cd ${projectName}`,
    `${manager} install`,
    "bunx karsa skills install",
    `${manager} run cf-typegen`,
    "bunx karsa db sync",
    "bunx wrangler d1 migrations apply DB --local",
    `${manager} run dev`,
  ];
}

export function printManualSteps(projectName: string, manager: PackageManager): void {
  log.info(
    [
      "Finish setup yourself with:",
      ...manualSetupSteps(projectName, manager).map((step) => `  ${step}`),
    ].join("\n"),
  );
}

export function printFailures(projectName: string, failures: StepFailure[]): void {
  log.warn(
    [
      "Some steps did not finish:",
      ...failures.flatMap((failure) => [
        `  ${failure.retry}`,
        `    ${failure.label.replace(/\n/g, "\n    ")}`,
      ]),
      "",
      `Fix the cause, then re-run those from ${projectName}/.`,
    ].join("\n"),
  );
}

export function printWarnings(warnings: string[]): void {
  if (warnings.length === 0) return;
  log.warn(["Steps that finished, but had something to say:", ...warnings].join("\n"));
}

export function printFooter(projectName: string, seeded: boolean): void {
  log.message(
    [
      // Not "demo data": `karsa db seed` runs each installed module's
      // seeds AND the project's own seed/ directory, which is where a real
      // site's starting catalog, categories, or settings belong.
      ...(seeded
        ? []
        : ["Load seed data (module seeds plus your own seed/): `bunx karsa db seed`."]),
      "Build with AI: read AGENTS.md, then ask for a Karsa site plan and implementation.",
      "Add or drop features: `bunx karsa add <module>` / `remove <module>`.",
      "Change locale, currency, and branding: astro.config.mjs's brand{}.",
      "",
      "Deploying to Cloudflare later needs real resources (local dev does not):",
      `  wrangler d1 create ${projectName}-db   # paste the UUID into wrangler.jsonc`,
      `  wrangler r2 bucket create ${projectName}-media`,
      "  wrangler secret put BETTER_AUTH_SECRET   # .dev.vars is local-only",
    ].join("\n"),
  );
}
