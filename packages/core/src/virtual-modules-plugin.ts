import type { Plugin } from "vite";
import type { KarsaBrand } from "./integration";
import type { ResolvedRegistry } from "./registry";

const RESOLVED_PREFIX = "\0";
const MODULE_PREFIX = "virtual:karsa/";

function resolveVirtualModuleId(id: string): string {
  return `${RESOLVED_PREFIX}${id}`;
}

/** Vite plugin that exposes the resolved module registry and brand config as virtual modules. */
export function karsaVirtualModulesPlugin(registry: ResolvedRegistry, brand: KarsaBrand): Plugin {
  // `registry.modules` carries ModuleMigration/ModuleSeed URLs, which
  // resolve on the developer's own machine (file://...) -- nothing at
  // runtime reads it (the CLI reads it directly off the integration
  // object, not this virtual module), so it's excluded here rather than
  // bundled into the client and leaking a local filesystem path.
  const { modules: _modules, ...clientRegistry } = registry;
  const modules: Record<string, string> = {
    "virtual:karsa/registry": `export default ${JSON.stringify(clientRegistry)};`,
    "virtual:karsa/admin-nav": `export default ${JSON.stringify(registry.adminNav)};`,
    "virtual:karsa/config": `export default ${JSON.stringify(brand)};`,
    "virtual:karsa/site-home-sections": [
      ...registry.siteHomeSections.map(
        (section, index) => `import Section${index} from ${JSON.stringify(section.entrypoint)};`,
      ),
      `export default ${JSON.stringify(registry.siteHomeSections)}.map((section, index) => ({ ...section, component: [${registry.siteHomeSections.map((_, index) => `Section${index}`).join(", ")}][index] }));`,
    ].join("\n"),
    "virtual:karsa/sitemap-sources": [
      ...registry.sitemapSources.map(
        (source, index) => `import * as Source${index} from ${JSON.stringify(source.entrypoint)};`,
      ),
      `export default ${JSON.stringify(registry.sitemapSources)}.map((source, index) => ({ ...source, module: [${registry.sitemapSources.map((_, index) => `Source${index}`).join(", ")}][index] }));`,
    ].join("\n"),
    "virtual:karsa/admin-dashboard-widgets": [
      ...registry.adminDashboardWidgets.map(
        (widget, index) => `import Widget${index} from ${JSON.stringify(widget.entrypoint)};`,
      ),
      `export default ${JSON.stringify(registry.adminDashboardWidgets)}.map((widget, index) => ({ ...widget, component: [${registry.adminDashboardWidgets.map((_, index) => `Widget${index}`).join(", ")}][index] }));`,
    ].join("\n"),
    "virtual:karsa/auth-panel-widgets": [
      ...registry.authPanelWidgets.map(
        (widget, index) => `import Widget${index} from ${JSON.stringify(widget.entrypoint)};`,
      ),
      `export default ${JSON.stringify(registry.authPanelWidgets)}.map((widget, index) => ({ ...widget, component: [${registry.authPanelWidgets.map((_, index) => `Widget${index}`).join(", ")}][index] }));`,
    ].join("\n"),
    "virtual:karsa/ambient-scripts": [
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
    name: "vite-plugin-karsa-virtual-modules",
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
