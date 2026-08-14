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

export interface ModuleMigration {
  /** Slug identifying this migration within its module, e.g. "init" or "add-fulfillment-type". */
  name: string;
  /**
   * Location of the migration's raw SQL, resolved relative to the module's
   * own source: `new URL("./migrations/0001_init.sql", import.meta.url)`.
   * A URL rather than a bare specifier so `tokotuku db sync` never has to
   * perform package resolution itself — the module already knows where its
   * own files are.
   */
  url: URL;
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
   * page rendered — e.g. orders' cart-badge sync. `@tokotuku/ui`'s Layout
   * renders every one of these on every page. This exists specifically so a
   * module like catalog, whose pages need cart behavior when orders is
   * installed, never has to import from `@tokotuku/orders` directly — that
   * would make catalog un-installable without orders, breaking a-la-carte.
   */
  ambientScripts?: string[];
}

/** Identity function that gives module authors autocomplete and validation. */
export function defineModule(definition: ModuleDefinition): ModuleDefinition {
  return definition;
}
