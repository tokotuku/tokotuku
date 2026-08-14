import type { Plugin } from "vite";
import type { TokotukuBrand } from "./integration";
import type { ResolvedRegistry } from "./registry";

const RESOLVED_PREFIX = "\0";
const MODULE_PREFIX = "virtual:tokotuku/";

function resolveVirtualModuleId(id: string): string {
  return `${RESOLVED_PREFIX}${id}`;
}

/** Vite plugin that exposes the resolved module registry and brand config as virtual modules. */
export function tokotukuVirtualModulesPlugin(
  registry: ResolvedRegistry,
  brand: TokotukuBrand,
): Plugin {
  // `registry.modules` carries ModuleMigration/ModuleSeed URLs, which
  // resolve on the developer's own machine (file://...) -- nothing at
  // runtime reads it (the CLI reads it directly off the integration
  // object, not this virtual module), so it's excluded here rather than
  // bundled into the client and leaking a local filesystem path.
  const { modules: _modules, ...clientRegistry } = registry;
  const modules: Record<string, string> = {
    "virtual:tokotuku/registry": `export default ${JSON.stringify(clientRegistry)};`,
    "virtual:tokotuku/admin-nav": `export default ${JSON.stringify(registry.adminNav)};`,
    "virtual:tokotuku/config": `export default ${JSON.stringify(brand)};`,
    "virtual:tokotuku/ambient-scripts": [
      ...registry.ambientScripts.map(
        (specifier, index) => `import Ambient${index} from ${JSON.stringify(specifier)};`,
      ),
      `export default [${registry.ambientScripts.map((_, index) => `Ambient${index}`).join(", ")}];`,
    ].join("\n"),
  };

  const resolutionMap = Object.fromEntries(
    Object.keys(modules).map((key) => [resolveVirtualModuleId(key), key]),
  );

  return {
    name: "vite-plugin-tokotuku-virtual-modules",
    resolveId(id) {
      if (id.startsWith(MODULE_PREFIX) && id in modules) return resolveVirtualModuleId(id);
      return undefined;
    },
    load(id) {
      if (!id.startsWith(RESOLVED_PREFIX)) return undefined;
      const resolution = resolutionMap[id];
      return resolution ? modules[resolution] : undefined;
    },
  };
}
