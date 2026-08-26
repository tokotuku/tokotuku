import { spawnSync } from "node:child_process";
import path from "node:path";
import { spinner } from "@clack/prompts";
import type { PackageManager } from "./environment";

export interface StepFailure {
  label: string;
  retry: string;
}

/** Keeps a captured stream readable when a tool is chatty, without hiding it. */
export function trim(output: string, maxLines: number): string {
  const lines = output.trim().split("\n");
  if (lines.length <= maxLines) return lines.join("\n");
  return [...lines.slice(0, maxLines), `… ${lines.length - maxLines} more line(s)`].join("\n");
}

/**
 * stderr is not an error channel for most of these tools: bun writes
 * "Resolving dependencies" and "Saved lockfile" there, and `bun run` echoes
 * the command itself. Reporting all of that as something to look at trains
 * you to skip the section that matters, so only lines that actually read
 * like a warning are surfaced. Heuristic on purpose -- a missed deprecation
 * notice costs far less than a wall of routine chatter nobody reads.
 */
const NOTEWORTHY = /(\bwarn|error|deprecat|vulnerab|peer\b|audit|EBADENGINE|ERR!)/i;

export function noteworthyLines(stderr: string): string {
  return stderr
    .split("\n")
    .filter((line) => NOTEWORTHY.test(line))
    .join("\n")
    .trim();
}

/**
 * Runs the setup steps, reporting each one as it happens.
 *
 * Uses spawnSync rather than execFileSync because a step's stderr matters
 * even when it succeeds: package managers and wrangler report deprecations,
 * peer-dependency conflicts, and audit notices there while still exiting 0,
 * and swallowing those is how a scaffold looks clean but isn't. Failures are
 * treated as recoverable -- the project files are already written and valid,
 * so a failed install is something to re-run, not a reason to leave someone
 * with a half-scaffolded directory and no idea what happened.
 */
export class StepRunner {
  readonly failures: StepFailure[] = [];
  readonly warnings: string[] = [];
  private readonly progress: ReturnType<typeof spinner> | undefined;

  constructor(
    private readonly cwd: string,
    interactive: boolean,
  ) {
    this.progress = interactive ? spinner() : undefined;
  }

  run(label: string, command: string, args: string[], retry: string): boolean {
    if (this.progress) this.progress.start(label);
    else console.log(`  ${label}`);

    const result = spawnSync(command, args, { cwd: this.cwd, encoding: "utf8" });
    const stderr = (result.stderr ?? "").trim();
    const ok = result.status === 0;

    this.progress?.stop(ok ? label : `${label} — failed`);

    if (!ok) {
      // On failure the whole stream is relevant, filtered or not -- the
      // useful line is often the last one, and it rarely says "error".
      this.failures.push({
        retry,
        label: stderr ? trim(stderr, 8) : `exited with code ${String(result.status)}`,
      });
      return false;
    }

    const notable = noteworthyLines(stderr);
    if (notable) this.warnings.push(`${retry}\n${trim(notable, 6).replace(/^/gm, "  ")}`);
    return true;
  }
}

function localBin(projectDir: string, name: string): string {
  return path.join(projectDir, "node_modules", ".bin", name);
}

export interface SetupOptions {
  destDir: string;
  manager: PackageManager;
  seed: boolean;
  gitInit: boolean;
  interactive: boolean;
}

/** Runs install and everything that depends on it, one visible step at a time. */
export function runSetup({
  destDir,
  manager,
  seed,
  gitInit,
  interactive,
}: SetupOptions): StepRunner {
  const runner = new StepRunner(destDir, interactive);

  const installed = runner.run(
    `Installing dependencies with ${manager}`,
    manager,
    ["install"],
    `${manager} install`,
  );

  // Everything below runs binaries out of the project's own node_modules, so
  // none of it can work if the install didn't.
  if (installed) {
    runner.run(
      "Generating Cloudflare Worker types",
      manager,
      ["run", "cf-typegen"],
      `${manager} run cf-typegen`,
    );
    runner.run(
      "Collecting module migrations",
      localBin(destDir, "karsa"),
      ["db", "sync"],
      "karsa db sync",
    );
    runner.run(
      "Installing agent skills",
      localBin(destDir, "karsa"),
      ["skills", "install"],
      "karsa skills install",
    );
    runner.run(
      "Applying migrations to the local database",
      localBin(destDir, "wrangler"),
      ["d1", "migrations", "apply", "DB", "--local"],
      "wrangler d1 migrations apply DB --local",
    );
    if (seed) {
      runner.run("Loading seed data", localBin(destDir, "karsa"), ["db", "seed"], "karsa db seed");
    }
  }

  if (gitInit) {
    runner.run("Initializing a git repository", "git", ["init", "--quiet"], "git init");
  }

  return runner;
}
