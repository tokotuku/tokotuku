export const NAME_PATTERN = /^[a-z0-9-]+$/;
export const NAME_RULE = "Use lowercase letters, digits, and hyphens only.";

const KNOWN_FLAGS = new Set(["--yes", "--no-install", "--seed"]);

export interface ParsedArgs {
  projectName: string | undefined;
  flags: Set<string>;
  registry: string | undefined;
}

export type ParseResult = { ok: true; args: ParsedArgs } | { ok: false; error: string };

/**
 * A hand-rolled parser rather than string.includes/find checks scattered
 * through main(): those silently swallowed a mistyped flag (--see instead
 * of --seed exited 0, having done nothing different) and a second
 * positional argument (create-takontuku app1 app2 quietly used only app1).
 * Both fail loudly here instead.
 */
export function parseArgs(argv: string[]): ParseResult {
  const positional: string[] = [];
  const flags = new Set<string>();
  let registry: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    if (arg === "--registry") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        return {
          ok: false,
          error: "--registry needs a URL, e.g. --registry http://localhost:4873",
        };
      }
      registry = value;
      i++;
      continue;
    }
    if (arg.startsWith("--")) {
      if (!KNOWN_FLAGS.has(arg)) {
        return {
          ok: false,
          error: `Unknown flag: ${arg}\nKnown flags: ${[...KNOWN_FLAGS, "--registry <url>"].join(", ")}`,
        };
      }
      flags.add(arg);
      continue;
    }
    positional.push(arg);
  }

  if (positional.length > 1) {
    return { ok: false, error: `Expected a single project name, got: ${positional.join(", ")}` };
  }
  const projectName = positional[0];
  if (projectName !== undefined && !NAME_PATTERN.test(projectName)) {
    return { ok: false, error: `Project name is invalid. ${NAME_RULE}` };
  }

  return { ok: true, args: { projectName, flags, registry } };
}
