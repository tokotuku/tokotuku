/// <reference path="./app-locals.d.ts" />
/// <reference path="./virtual.d.ts" />
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import type { FormattersConfig } from "./format";
import type { ModuleDefinition } from "./module";
import { type ResolvedRegistry, resolveModules } from "./registry";
import { buildThemeAliases } from "./theme-alias";
import { takontukuVirtualModulesPlugin } from "./virtual-modules-plugin";

export { defineModule } from "./module";

export interface TakontukuAuthBrand {
  /** Public URL (or path) for the decorative auth panel image. */
  backgroundImage?: string;
  /** CSS object-position used by the auth panel image. */
  backgroundPosition?: string;
}

export interface TakontukuStorefrontBrand {
  announcement?: string | false;
  hero?: {
    eyebrow?: string;
    title?: string;
    description?: string;
    image?: string;
    imagePosition?: string;
  };
  links?: Array<{ label: string; href: string }>;
  newsletter?: { action: string };
}

export interface TakontukuBrand extends FormattersConfig {
  name: string;
  logo?: { src: string; alt?: string };
  palette?: {
    light?: { accent: string; accentForeground: string };
    dark?: { accent: string; accentForeground: string };
  };
  storefront?: TakontukuStorefrontBrand;
  auth?: TakontukuAuthBrand;
  /** Optional sparse overrides for package-owned localized dictionaries. */
  messages?: Record<string, string>;
}

export interface TakontukuOptions {
  brand: TakontukuBrand;
  modules: ModuleDefinition[];
}

/** An AstroIntegration, plus the resolved registry `takontuku db sync` reads directly off the config's integrations array. */
export type TakontukuIntegration = AstroIntegration & { registry: ResolvedRegistry };

/**
 * The admin shell (layout, dashboard, error pages, media proxy) is not
 * optional — every client gets one, per the "admin panel D1-backed" decision
 * made before any module existed. Modeling it as an always-first
 * ModuleDefinition (rather than special-casing it in resolveModules) means
 * the registry has exactly one merge path, not two.
 */
const CORE_MODULE: ModuleDefinition = {
  name: "core",
  guardedPrefixes: ["/admin"],
  adminNav: [
    {
      label: "Dashboard",
      labelByLocale: { id: "Dashboard", en: "Dashboard" },
      href: "/admin",
      icon: "dashboard",
      order: 0,
    },
  ],
  storefrontRoutes: [
    { pattern: "/403", entrypoint: "@takontuku/core/routes/403.astro" },
    { pattern: "/404", entrypoint: "@takontuku/core/routes/404.astro" },
    {
      pattern: "/api/images/[...key]",
      entrypoint: "@takontuku/core/routes/api/images/[...key].ts",
    },
  ],
  adminRoutes: [{ pattern: "/admin", entrypoint: "@takontuku/core/routes/admin/index.astro" }],
};

export function takontuku(options: TakontukuOptions): TakontukuIntegration {
  const registry = resolveModules([CORE_MODULE, ...options.modules]);

  return {
    name: "@takontuku/core",
    registry,
    hooks: {
      "astro:config:setup": ({
        config,
        updateConfig,
        addWatchFile,
        addMiddleware,
        injectRoute,
      }) => {
        const themeDirUrl = new URL("./theme/", config.srcDir);
        const themeDir = fileURLToPath(themeDirUrl);
        addWatchFile(themeDirUrl);
        const themeFiles = existsSync(themeDir) ? readdirSync(themeDir) : [];
        const alias = buildThemeAliases(themeDir.replace(/\/$/, ""), themeFiles);

        updateConfig({
          vite: {
            plugins: [takontukuVirtualModulesPlugin(registry, options.brand)],
            ...(alias.length ? { resolve: { alias } } : {}),
          },
        });

        addMiddleware({ entrypoint: "@takontuku/core/middleware", order: "pre" });

        for (const route of registry.storefrontRoutes) {
          injectRoute({
            pattern: route.pattern,
            entrypoint: route.entrypoint,
            prerender: route.prerender ?? false,
          });
        }
        for (const route of registry.adminRoutes) {
          injectRoute({
            pattern: route.pattern,
            entrypoint: route.entrypoint,
            prerender: route.prerender ?? false,
          });
        }
      },
    },
  };
}
