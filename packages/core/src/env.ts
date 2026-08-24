import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

/**
 * The subset of Cloudflare bindings framework code depends on. A client's
 * generated `Env` (from `wrangler types`) satisfies this structurally as
 * long as it has `DB`/`MEDIA` bindings and a `BETTER_AUTH_SECRET` var — no
 * explicit implementing clause needed. `MEDIA` is deliberately not named
 * `IMAGES` — that collides with @astrojs/cloudflare's own default
 * Cloudflare Images binding.
 */
export interface KarsaEnv {
  DB: D1Database;
  MEDIA: R2Bucket;
  BETTER_AUTH_SECRET: string;
  /** Secret required before an uninitialized site can claim its first admin. */
  KARSA_SETUP_TOKEN?: string;
  /** Public Turnstile site key used by modules that protect anonymous forms. */
  TURNSTILE_SITE_KEY?: string;
  /** Secret used by the server-side Turnstile Siteverify call. */
  TURNSTILE_SECRET?: string;
  /** Comma-separated hostnames accepted from Turnstile Siteverify. */
  TURNSTILE_HOSTNAMES?: string;
}
