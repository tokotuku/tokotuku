import { defineModule, type ModuleDefinition } from "@tokotuku/core";

export function auth(): ModuleDefinition {
  return defineModule({
    name: "auth",
    migrations: [{ name: "init", url: new URL("../migrations/0001_init.sql", import.meta.url) }],
    storefrontRoutes: [
      { pattern: "/login", entrypoint: "@tokotuku/auth/routes/login.astro" },
      { pattern: "/register", entrypoint: "@tokotuku/auth/routes/register.astro" },
      {
        pattern: "/forgot-password",
        entrypoint: "@tokotuku/auth/routes/forgot-password.astro",
      },
      { pattern: "/setup", entrypoint: "@tokotuku/auth/routes/setup.astro" },
      {
        pattern: "/api/auth/[...all]",
        entrypoint: "@tokotuku/auth/routes/api/auth/[...all].ts",
      },
    ],
  });
}

export { authClient } from "./auth-client";
export { authMessages } from "./messages";
export { canAccessBackoffice, type UserRole, userRoles } from "./roles";
export { claimSetup, completeSetup, isSetupComplete, releaseSetupClaim } from "./setup";
