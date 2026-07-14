#!/usr/bin/env bun

import { runCreateComponent } from "./commands/create-component.js";
import { runGenerateChangelog } from "./commands/generate-changelog.js";
import { runGenerateDocs } from "./commands/generate-docs.js";
import { runGenerateIcon } from "./commands/generate-icon.js";
import { runGeneratePlayground } from "./commands/generate-playground.js";

const HELP = `tokotuku — Tokotuku UI developer CLI

Usage:
  tokotuku create component <name>
  tokotuku generate icon <name>
  tokotuku generate docs
  tokotuku generate playground
  tokotuku generate changelog
`;

async function main(): Promise<void> {
  const [command, subcommand, ...rest] = process.argv.slice(2);

  if (!command || command === "--help" || command === "-h") {
    console.log(HELP);
    return;
  }

  if (command === "create" && subcommand === "component") {
    await runCreateComponent(rest);
    return;
  }

  if (command === "generate") {
    switch (subcommand) {
      case "icon":
        await runGenerateIcon(rest);
        return;
      case "docs":
        await runGenerateDocs();
        return;
      case "playground":
        await runGeneratePlayground();
        return;
      case "changelog":
        await runGenerateChangelog();
        return;
      default:
        break;
    }
  }

  console.error(`Unknown command: ${[command, subcommand].filter(Boolean).join(" ")}`);
  console.log(HELP);
  process.exitCode = 1;
}

await main();
