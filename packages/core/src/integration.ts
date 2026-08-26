/// <reference path="./app-locals.d.ts" />
/// <reference path="./virtual.d.ts" />
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { PaletteColors } from "@karsa/theme/palette";
import type { AstroIntegration } from "astro";
import type { FormattersConfig } from "./format";
import type { ModuleDefinition } from "./module";
import { type ResolvedRegistry, resolveModules } from "./registry";
import { buildThemeAliases } from "./theme-alias";
import { karsaVirtualModulesPlugin } from "./virtual-modules-plugin";

export { defineModule } from "./module";

export interface KarsaAuthBrand {
  /** Public URL (or path) for the decorative auth panel image. */
  backgroundImage?: string;
  /** CSS object-position used by the auth panel image. */
  backgroundPosition?: string;
}

export type KarsaPaletteColors = PaletteColors;

export interface KarsaSiteBrand {
  announcement?: string | false;
  hero?: {
    eyebrow?: string;
    title?: string;
    description?: string;
    image?: string;
    imagePosition?: string;
    primaryAction?: { label: string; href: string };
  };
  links?: Array<{ label: string; href: string }>;
  newsletter?: { action: string };
}

export type KarsaAdminDashboardArtwork =
  | "abstract"
  | "energy"
  | {
      light: string;
      dark?: string;
      position?: string;
    };

export interface KarsaAdminBrand {
  /** Decorative artwork preset or custom light/dark URLs used by the admin dashboard. */
  dashboardArtwork?: KarsaAdminDashboardArtwork;
}

export interface KarsaBrand extends FormattersConfig {
  name: string;
  logo?: { src: string; alt?: string };
  admin?: KarsaAdminBrand;
  palette?: {
    light?: KarsaPaletteColors;
    dark?: KarsaPaletteColors;
  };
  site?: KarsaSiteBrand;
  auth?: KarsaAuthBrand;
  /** Optional sparse overrides for package-owned localized dictionaries. */
  messages?: Record<string, string>;
}

export interface KarsaOptions {
  brand: KarsaBrand;
  modules: ModuleDefinition[];
}

/** An AstroIntegration, plus the resolved registry `karsa db sync` reads directly off the config's integrations array. */
export type KarsaIntegration = AstroIntegration & { registry: ResolvedRegistry };

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
  siteRoutes: [
    { pattern: "/403", entrypoint: "@karsa/core/routes/403.astro" },
    { pattern: "/404", entrypoint: "@karsa/core/routes/404.astro" },
    { pattern: "/sitemap.xml", entrypoint: "@karsa/core/routes/sitemap.xml.ts" },
    {
      pattern: "/api/images/[...key]",
      entrypoint: "@karsa/core/routes/api/images/[...key].ts",
    },
  ],
  adminRoutes: [{ pattern: "/admin", entrypoint: "@karsa/core/routes/admin/index.astro" }],
};

export function karsa(options: KarsaOptions): KarsaIntegration {
  const registry = resolveModules([CORE_MODULE, ...options.modules]);
  for (const field of registry.requiredBrandFields) {
    if (!options.brand[field]) {
      throw new Error(`Karsa configuration error: installed modules require brand.${field}.`);
    }
  }

  return {
    name: "@karsa/core",
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
            plugins: [karsaVirtualModulesPlugin(registry, options.brand)],
            ...(alias.length ? { resolve: { alias } } : {}),
          },
        });

        addMiddleware({ entrypoint: "@karsa/core/middleware", order: "pre" });

        for (const route of registry.siteRoutes) {
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
