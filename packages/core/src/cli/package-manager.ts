import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type PackageManager = "bun" | "pnpm" | "npm" | "yarn";

const LOCKFILE_BY_MANAGER: [string, PackageManager][] = [
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
  ["pnpm-lock.yaml", "pnpm"],
  ["package-lock.json", "npm"],
  ["yarn.lock", "yarn"],
];

/** Picks the package manager to shell out to by which lockfile is present in `cwd` -- defaults to bun, this framework's own tooling, when none is found. */
export function detectPackageManager(cwd: string): PackageManager {
  for (const [file, manager] of LOCKFILE_BY_MANAGER) {
    if (existsSync(path.join(cwd, file))) return manager;
  }
  return "bun";
}

export interface PackageJsonShape {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export function readPackageJson(cwd: string): PackageJsonShape {
  return JSON.parse(readFileSync(path.join(cwd, "package.json"), "utf8"));
}

export function isDependencyDeclared(pkgJson: PackageJsonShape, name: string): boolean {
  return Boolean(pkgJson.dependencies?.[name] ?? pkgJson.devDependencies?.[name]);
}

/** True if any sibling @karsa/* dependency uses the workspace protocol -- the signal that `cwd` is a member of this monorepo rather than a standalone client, where a bare install would resolve from the registry and sever the workspace link. */
export function isWorkspaceMember(pkgJson: PackageJsonShape): boolean {
  const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
  return Object.entries(deps).some(
    ([name, spec]) => name.startsWith("@karsa/") && spec.startsWith("workspace:"),
  );
}

/** The version specifier to reuse for a new @karsa/* dependency, copied from an existing sibling so a monorepo member keeps "workspace:*" and a pinned client keeps its pinned version instead of drifting to "latest". Falls back to "latest" when there's no sibling to copy from yet. */
export function siblingKarsaSpecifier(pkgJson: PackageJsonShape): string {
  const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
  const sibling = Object.entries(deps).find(([name]) => name.startsWith("@karsa/"));
  return sibling?.[1] ?? "latest";
}

export function addDependency(cwd: string, manager: PackageManager, spec: string): void {
  const args = ["add", spec];
  console.log(`+ ${manager} ${args.join(" ")}`);
  execFileSync(manager, args, { cwd, stdio: "inherit" });
}

export function removeDependency(cwd: string, manager: PackageManager, name: string): void {
  const args = [manager === "npm" ? "uninstall" : "remove", name];
  console.log(`+ ${manager} ${args.join(" ")}`);
  execFileSync(manager, args, { cwd, stdio: "inherit" });
}
