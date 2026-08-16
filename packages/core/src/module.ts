export interface AdminNavItem {
  label: string;
  /** Optional package-owned labels for the built-in Indonesian/English dictionaries. */
  labelByLocale?: Partial<Record<"id" | "en", string>>;
  /** Optional localized shortcut description shown by the operational dashboard. */
  descriptionByLocale?: Partial<Record<"id" | "en", string>>;
  href: string;
  /** A key the shell's icon set recognizes, or raw SVG path data for a module shipping its own glyph. */
  icon: string | string[];
  order?: number;
  badge?: string;
}

export interface ModuleRoute {
  pattern: string;
  entrypoint: string;
  prerender?: boolean;
}

export interface StorefrontHomeSection {
  id: string;
  entrypoint: string;
  order?: number;
}

export interface AdminDashboardWidget {
  id: string;
  entrypoint: string;
  area: "summary" | "main" | "aside";
  order?: number;
}

export interface ModuleMigration {
  /** Slug identifying this migration within its module, e.g. "init" or "add-fulfillment-type". */
  name: string;
  /**
   * Location of the migration's raw SQL, resolved relative to the module's
   * own source: `new URL("./migrations/0001_init.sql", import.meta.url)`.
   * A URL rather than a bare specifier so `takontuku db sync` never has to
   * perform package resolution itself — the module already knows where its
   * own files are.
   */
  url: URL;
}

export interface ModuleSeed {
  /** Slug identifying this seed within its module, shown in `takontuku db seed` output. */
  name: string;
  /**
   * Location of the seed's raw SQL, resolved relative to the module's own
   * source: `new URL("../seeds/demo-catalog.sql", import.meta.url)`. Should
   * be idempotent (`INSERT OR IGNORE`, matched by a unique column rather
   * than an explicit id) since `db seed` may run more than once.
   */
  sql: URL;
  /**
   * A directory whose tree maps 1:1 onto R2 object keys under this seed's
   * module — `<media>/products/widget.svg` uploads to key
   * `products/widget.svg`. Every derived key must fall under one of this
   * module's own `mediaPrefixes`, or `db seed` refuses to run rather than
   * silently uploading something the media route will 404 on.
   */
  media?: URL;
}

export interface ModuleDefinition {
  name: string;
  /** Names of other modules that must be installed and resolved first. */
  requires?: string[];
  /** Path prefixes that require an authenticated, backoffice-capable session. */
  guardedPrefixes?: string[];
  /**
   * R2 object key prefixes this module allows the generic media route to
   * serve without auth (e.g. `"catalog/"`). Anything not covered by some
   * module's prefix 404s — a module that never declares one is never
   * publicly readable, even by accident.
   */
  mediaPrefixes?: string[];
  /**
   * Routes to inject via Astro's `injectRoute`. Omit when the module's pages
   * already exist as native files in the consuming app (nothing to inject).
   */
  storefrontRoutes?: ModuleRoute[];
  adminRoutes?: ModuleRoute[];
  adminNav?: AdminNavItem[];
  /** Optional packaged sections rendered by the core storefront homepage. */
  storefrontHomeSections?: StorefrontHomeSection[];
  /** Optional operational widgets rendered by the core admin dashboard. */
  adminDashboardWidgets?: AdminDashboardWidget[];
  /**
   * This module's own migrations, in the order they must be applied. `db
   * sync` assigns each a global sequence number the first time it sees it —
   * append new entries for schema changes, never edit or remove one that
   * already shipped.
   */
  migrations?: ModuleMigration[];
  /**
   * Bare specifiers for `.astro` components that render page-wide client
   * behavior (a `<script>` tag, nothing visual) needed regardless of which
   * page rendered — e.g. orders' cart-badge sync. `@takontuku/ui`'s Layout
   * renders every one of these on every page. This exists specifically so a
   * module like catalog, whose pages need cart behavior when orders is
   * installed, never has to import from `@takontuku/orders` directly — that
   * would make catalog un-installable without orders, breaking a-la-carte.
   */
  ambientScripts?: string[];
  /**
   * Demo data for `takontuku db seed` — local-only, never applied to a
   * remote database. Omit entirely for a module with nothing meaningful to
   * demo (auth, for instance, has no seed: publishing a working password
   * hash would ship a known credential in the npm package).
   */
  seeds?: ModuleSeed[];
}

/** Identity function that gives module authors autocomplete and validation. */
export function defineModule(definition: ModuleDefinition): ModuleDefinition {
  return definition;
}
