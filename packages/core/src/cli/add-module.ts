import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { addImport, addModuleEntry, findImport, hasModuleEntry } from "./astro-config";
import { addRegisterImport } from "./middleware-source";
import { inspectModulePackage } from "./module-package";
import {
  addDependency,
  detectPackageManager,
  isDependencyDeclared,
  isWorkspaceMember,
  readPackageJson,
  siblingTakontukuSpecifier,
} from "./package-manager";

const CONFIG_FILE = "astro.config.mjs";
const MIDDLEWARE_RELATIVE = path.join("src", "middleware.ts");

export interface AddedModule {
  packageName: string;
  moduleName: string;
  exportName: string;
}

export interface AddModuleResult {
  alreadyInstalled: boolean;
  added: AddedModule[];
  filesChanged: string[];
}

function isAlreadyWired(config: string, packageName: string): boolean {
  const decl = findImport(config, packageName);
  if (!decl || decl.namedLocals.length === 0) return false;
  return decl.namedLocals.some(({ local }) => {
    try {
      return hasModuleEntry(config, local);
    } catch {
      return false;
    }
  });
}

async function ensureDependencyDeclared(
  cwd: string,
  packageName: string,
  versionRange: string | null,
  install: boolean,
  filesChanged: Set<string>,
): Promise<void> {
  const pkgJson = readPackageJson(cwd);
  if (isDependencyDeclared(pkgJson, packageName)) return;

  const manager = detectPackageManager(cwd);
  const monorepoMember = isWorkspaceMember(pkgJson);

  if (install && monorepoMember) {
    console.log(
      `${packageName} looks like a workspace member of this monorepo -- writing package.json directly instead of running ${manager} add, which would resolve from the registry and break the workspace link.`,
    );
  }

  if (install && !monorepoMember) {
    addDependency(cwd, manager, versionRange ? `${packageName}@${versionRange}` : packageName);
  } else {
    const versionSpec = versionRange ?? siblingTakontukuSpecifier(pkgJson);
    pkgJson.dependencies = { ...pkgJson.dependencies, [packageName]: versionSpec };
    await writeFile(path.join(cwd, "package.json"), `${JSON.stringify(pkgJson, null, 2)}\n`);
  }
  filesChanged.add("package.json");
}

async function addRequiredDependencies(
  cwd: string,
  requires: string[],
  moduleName: string,
  install: boolean,
  filesChanged: Set<string>,
  seen: Set<string>,
): Promise<AddedModule[]> {
  const added: AddedModule[] = [];
  for (const depName of requires) {
    const depPackage = `@takontuku/${depName}`;
    const result = await addOne(cwd, depPackage, null, install, filesChanged, seen);
    // Only announce it if addOne actually did something -- it returns []
    // both when already wired and when already visited earlier in this same
    // recursion, and neither case is "also adding" anything.
    if (result.length > 0) {
      console.log(`Also adding "${depName}", which "${moduleName}" requires.`);
    }
    added.push(...result);
  }
  return added;
}

async function readMiddlewareOrThrow(middlewarePath: string, packageName: string): Promise<string> {
  try {
    return await readFile(middlewarePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `${packageName} needs a register line, but ${middlewarePath} does not exist. Create it from the create-takontuku template, then re-run.`,
      );
    }
    throw error;
  }
}

async function wireMiddleware(
  cwd: string,
  packageName: string,
  filesChanged: Set<string>,
): Promise<void> {
  const middlewarePath = path.join(cwd, MIDDLEWARE_RELATIVE);
  const middleware = await readMiddlewareOrThrow(middlewarePath, packageName);
  const withRegister = addRegisterImport(middleware, `${packageName}/register`);
  if (withRegister !== middleware) {
    await writeFile(middlewarePath, withRegister);
    filesChanged.add(MIDDLEWARE_RELATIVE);
  }
}

async function wireConfigAndMiddleware(
  cwd: string,
  packageName: string,
  info: { exportName: string; hasRegisterExport: boolean },
  filesChanged: Set<string>,
): Promise<void> {
  const configPath = path.join(cwd, CONFIG_FILE);
  const freshConfig = await readFile(configPath, "utf8");
  const { source: withImport, local } = addImport(freshConfig, packageName, info.exportName);
  const withEntry = addModuleEntry(withImport, local);
  if (withEntry !== freshConfig) {
    await writeFile(configPath, withEntry);
    filesChanged.add(CONFIG_FILE);
  }

  if (info.hasRegisterExport) {
    await wireMiddleware(cwd, packageName, filesChanged);
  }
}

async function addOne(
  cwd: string,
  packageName: string,
  versionRange: string | null,
  install: boolean,
  filesChanged: Set<string>,
  seen: Set<string>,
): Promise<AddedModule[]> {
  if (packageName === "@takontuku/core") {
    throw new Error(
      '"core" is built into every takontuku app — it is never listed in modules[]. There is nothing to add or remove.',
    );
  }
  if (seen.has(packageName)) return [];
  seen.add(packageName);

  const config = await readFile(path.join(cwd, CONFIG_FILE), "utf8");
  if (isAlreadyWired(config, packageName)) return [];

  await ensureDependencyDeclared(cwd, packageName, versionRange, install, filesChanged);

  const info = await inspectModulePackage(cwd, packageName);
  const added = await addRequiredDependencies(
    cwd,
    info.requires,
    info.moduleName,
    install,
    filesChanged,
    seen,
  );

  await wireConfigAndMiddleware(cwd, packageName, info, filesChanged);

  added.push({ packageName, moduleName: info.moduleName, exportName: info.exportName });
  return added;
}

export interface AddModuleOptions {
  cwd: string;
  packageName: string;
  versionRange: string | null;
  install: boolean;
}

/**
 * Installs a @takontuku/* module package and wires it into
 * astro.config.mjs (import + modules[] entry) and, if the package ships
 * one, src/middleware.ts's register import -- then recurses into any
 * modules it `requires` that aren't installed yet. Never touches
 * migrations/ or the lockfile; that's the caller's `db sync` step.
 */
export async function addModule(options: AddModuleOptions): Promise<AddModuleResult> {
  const { cwd, packageName, versionRange, install } = options;
  const config = await readFile(path.join(cwd, CONFIG_FILE), "utf8");
  if (packageName !== "@takontuku/core" && isAlreadyWired(config, packageName)) {
    return { alreadyInstalled: true, added: [], filesChanged: [] };
  }

  const filesChanged = new Set<string>();
  const added = await addOne(cwd, packageName, versionRange, install, filesChanged, new Set());
  return { alreadyInstalled: false, added, filesChanged: [...filesChanged] };
}
