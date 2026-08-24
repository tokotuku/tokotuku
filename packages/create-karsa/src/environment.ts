export type PackageManager = "bun" | "npm" | "pnpm" | "yarn";

export const PACKAGE_MANAGERS: PackageManager[] = ["bun", "npm", "pnpm", "yarn"];

/**
 * Picks the package manager from the one that invoked this scaffolder --
 * `npm create` / `bun create` / `pnpm create` all set npm_config_user_agent.
 * Defaults to bun, this framework's own tooling, when run directly.
 */
export function detectPackageManager(): PackageManager {
  // Destructured rather than accessed as a property: this key isn't declared
  // on ProcessEnv, and bracket access to satisfy that trips Biome's
  // useLiteralKeys in the other direction.
  const { npm_config_user_agent: agent = "" } = process.env;
  for (const manager of PACKAGE_MANAGERS) {
    if (agent.startsWith(`${manager}/`)) return manager;
  }
  return "bun";
}
