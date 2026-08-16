import type { Plugin } from "vite";
import type { TakontukuBrand } from "./integration";
import type { ResolvedRegistry } from "./registry";

const RESOLVED_PREFIX = "\0";
const MODULE_PREFIX = "virtual:takontuku/";

function resolveVirtualModuleId(id: string): string {
  return `${RESOLVED_PREFIX}${id}`;
}

/** Vite plugin that exposes the resolved module registry and brand config as virtual modules. */
export function takontukuVirtualModulesPlugin(
  registry: ResolvedRegistry,
  brand: TakontukuBrand,
): Plugin {
  // `registry.modules` carries ModuleMigration/ModuleSeed URLs, which
  // resolve on the developer's own machine (file://...) -- nothing at
  // runtime reads it (the CLI reads it directly off the integration
  // object, not this virtual module), so it's excluded here rather than
  // bundled into the client and leaking a local filesystem path.
  const { modules: _modules, ...clientRegistry } = registry;
  const modules: Record<string, string> = {
    "virtual:takontuku/registry": `export default ${JSON.stringify(clientRegistry)};`,
    "virtual:takontuku/admin-nav": `export default ${JSON.stringify(registry.adminNav)};`,
    "virtual:takontuku/config": `export default ${JSON.stringify(brand)};`,
    "virtual:takontuku/storefront-home-sections": [
      ...registry.storefrontHomeSections.map(
        (section, index) =>
          "import Section" + index + " from " + JSON.stringify(section.entrypoint) + ";",
      ),
      "export default " +
        JSON.stringify(registry.storefrontHomeSections) +
        ".map((section, index) => ({ ...section, component: [" +
        registry.storefrontHomeSections.map((_, index) => "Section" + index).join(", ") +
        "][index] }));",
    ].join("\n"),
    "virtual:takontuku/admin-dashboard-widgets": [
      ...registry.adminDashboardWidgets.map(
        (widget, index) =>
          "import Widget" + index + " from " + JSON.stringify(widget.entrypoint) + ";",
      ),
      "export default " +
        JSON.stringify(registry.adminDashboardWidgets) +
        ".map((widget, index) => ({ ...widget, component: [" +
        registry.adminDashboardWidgets.map((_, index) => "Widget" + index).join(", ") +
        "][index] }));",
    ].join("\n"),
    "virtual:takontuku/ambient-scripts": [
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
    name: "vite-plugin-takontuku-virtual-modules",
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
