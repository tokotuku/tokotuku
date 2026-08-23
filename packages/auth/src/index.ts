import { defineModule, type ModuleDefinition } from "@takontuku/core";

export function auth(): ModuleDefinition {
  return defineModule({
    name: "auth",
    migrations: [{ name: "init", url: new URL("../migrations/0001_init.sql", import.meta.url) }],
    storefrontRoutes: [
      { pattern: "/login", entrypoint: "@takontuku/auth/routes/login.astro" },
      { pattern: "/register", entrypoint: "@takontuku/auth/routes/register.astro" },
      {
        pattern: "/forgot-password",
        entrypoint: "@takontuku/auth/routes/forgot-password.astro",
      },
      { pattern: "/setup", entrypoint: "@takontuku/auth/routes/setup.astro" },
      {
        pattern: "/api/auth/[...all]",
        entrypoint: "@takontuku/auth/routes/api/auth/[...all].ts",
      },
    ],
  });
}

export { authMessages } from "./messages";
export { canAccessBackoffice, type UserRole, userRoles } from "./roles";
export { claimSetup, completeSetup, isSetupComplete, releaseSetupClaim } from "./setup";
