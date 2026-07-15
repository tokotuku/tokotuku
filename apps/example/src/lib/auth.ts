import { betterAuth } from "better-auth";

// Built fresh per request (not module-level) — the D1 binding only exists
// inside request scope, matching the `cloudflare:workers` env pattern already
// used in index.astro and the api/images route.
//
// `baseURL` is derived from the incoming request's own origin rather than a
// fixed env var: `astro dev` picks whatever port is free (4321, 4322, ...),
// and a hardcoded baseURL that doesn't match the actual origin fails Better
// Auth's origin check with a 403 ("Invalid origin").
export function createAuth(env: Env, baseURL: string) {
  return betterAuth({
    database: env.DB,
    emailAndPassword: {
      enabled: true,
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL,
  });
}
