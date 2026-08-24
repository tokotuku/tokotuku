import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ResolvedRegistry } from "../registry";
import { findImport, removeImport, removeModuleEntry } from "./astro-config";
import { removeRegisterImport } from "./middleware-source";
import {
  detectPackageManager,
  isDependencyDeclared,
  readPackageJson,
  removeDependency,
} from "./package-manager";

const CONFIG_FILE = "astro.config.mjs";
const MIDDLEWARE_RELATIVE = path.join("src", "middleware.ts");

export interface RemoveModuleOptions {
  cwd: string;
  packageName: string;
  moduleName: string;
  install: boolean;
  registry: ResolvedRegistry;
}

export interface RemoveModuleResult {
  notInstalled: boolean;
  filesChanged: string[];
}

function assertNoDependents(registry: ResolvedRegistry, moduleName: string): void {
  for (const mod of registry.modules) {
    if (mod.name === moduleName) continue;
    if (mod.requires?.includes(moduleName)) {
      throw new Error(
        `"${mod.name}" requires "${moduleName}", so "${moduleName}" can't be removed while "${mod.name}" is installed. Run: karsa remove ${mod.name}`,
      );
    }
  }
}

async function updateConfigForRemoval(
  cwd: string,
  config: string,
  local: string | undefined,
  packageName: string,
  filesChanged: Set<string>,
): Promise<void> {
  if (!local) return;
  const withoutEntry = removeModuleEntry(config, local);
  const withoutImport = removeImport(withoutEntry, packageName);
  if (withoutImport !== config) {
    await writeFile(path.join(cwd, CONFIG_FILE), withoutImport);
    filesChanged.add(CONFIG_FILE);
  }
}

async function updateMiddlewareForRemoval(
  cwd: string,
  packageName: string,
  filesChanged: Set<string>,
): Promise<void> {
  const middlewarePath = path.join(cwd, MIDDLEWARE_RELATIVE);
  let middleware: string;
  try {
    middleware = await readFile(middlewarePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  const withoutRegister = removeRegisterImport(middleware, `${packageName}/register`);
  if (withoutRegister !== middleware) {
    await writeFile(middlewarePath, withoutRegister);
    filesChanged.add(MIDDLEWARE_RELATIVE);
  }
}

function uninstallDependencyIfDeclared(
  cwd: string,
  packageName: string,
  filesChanged: Set<string>,
): void {
  const pkgJson = readPackageJson(cwd);
  if (!isDependencyDeclared(pkgJson, packageName)) return;
  const manager = detectPackageManager(cwd);
  removeDependency(cwd, manager, packageName);
  filesChanged.add("package.json");
}

/**
 * Removes a @karsa/* module's astro.config.mjs import + modules[]
 * entry, its src/middleware.ts register line if present, and (unless
 * `install` is false) the package.json dependency -- refuses if another
 * installed module still `requires` it. Never touches migrations/ or the
 * lockfile: an already-applied migration is never rewritten, and the
 * lockfile entry is what keeps a later `add` of the same module from
 * re-emitting them at new sequence numbers.
 */
export async function removeModule(options: RemoveModuleOptions): Promise<RemoveModuleResult> {
  const { cwd, packageName, moduleName, install, registry } = options;

  if (packageName === "@karsa/core") {
    throw new Error(
      '"core" is built into every karsa app — it is never listed in modules[]. There is nothing to add or remove.',
    );
  }

  const config = await readFile(path.join(cwd, CONFIG_FILE), "utf8");
  const decl = findImport(config, packageName);
  if (!decl && !registry.moduleNames.includes(moduleName)) {
    return { notInstalled: true, filesChanged: [] };
  }

  assertNoDependents(registry, moduleName);

  const filesChanged = new Set<string>();
  await updateConfigForRemoval(cwd, config, decl?.namedLocals[0]?.local, packageName, filesChanged);
  await updateMiddlewareForRemoval(cwd, packageName, filesChanged);
  if (install) uninstallDependencyIfDeclared(cwd, packageName, filesChanged);

  return { notInstalled: false, filesChanged: [...filesChanged] };
}
