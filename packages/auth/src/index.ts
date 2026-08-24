import { defineModule, type ModuleDefinition } from "@karsa/core";

export interface AuthOptions {
  registration: "public" | "closed";
}

/**
 * Public registration is the backwards-compatible CLI default. Presets pass
 * an explicit mode, while `karsa add auth` can still discover this zero-arity
 * factory and wire a usable module into an existing app.
 */
export function auth({ registration }: AuthOptions = { registration: "public" }): ModuleDefinition {
  return defineModule({
    name: "auth",
    clientConfig: { registration },
    migrations: [{ name: "init", url: new URL("../migrations/0001_init.sql", import.meta.url) }],
    siteRoutes: [
      { pattern: "/login", entrypoint: "@karsa/auth/routes/login.astro" },
      ...(registration === "public"
        ? [{ pattern: "/register", entrypoint: "@karsa/auth/routes/register.astro" }]
        : []),
      {
        pattern: "/forgot-password",
        entrypoint: "@karsa/auth/routes/forgot-password.astro",
      },
      { pattern: "/setup", entrypoint: "@karsa/auth/routes/setup.astro" },
      {
        pattern: "/api/auth/[...all]",
        entrypoint: "@karsa/auth/routes/api/auth/[...all].ts",
      },
    ],
  });
}

export { authMessages } from "./messages";
export { safeInternalPath } from "./redirects";
export { canAccessBackoffice, type UserRole, userRoles } from "./roles";
export { claimSetup, completeSetup, isSetupComplete, releaseSetupClaim } from "./setup";
