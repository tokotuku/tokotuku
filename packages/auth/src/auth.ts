import type { KarsaEnv } from "@karsa/core";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";

const statements = {
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "impersonate",
    "impersonate-admins",
    "delete",
    "set-password",
    "set-email",
    "get",
    "update",
  ],
  session: ["list", "revoke", "delete"],
} as const;

const accessControl = createAccessControl(statements);

const roles = {
  admin: accessControl.newRole({
    user: [
      "create",
      "list",
      "set-role",
      "ban",
      "impersonate",
      "impersonate-admins",
      "delete",
      "set-password",
      "set-email",
      "get",
      "update",
    ],
    session: ["list", "revoke", "delete"],
  }),
  staff: accessControl.newRole({
    user: ["list", "get", "update"],
    session: [],
  }),
  customer: accessControl.newRole({
    user: [],
    session: [],
  }),
};

// Built fresh per request (not module-level) — the D1 binding only exists
// inside request scope, matching the `cloudflare:workers` env pattern already
// used in index.astro and the api/images route.
//
// `baseURL` is derived from the incoming request's own origin rather than a
// fixed env var: `astro dev` picks whatever port is free (4321, 4322, ...),
// and a hardcoded baseURL that doesn't match the actual origin fails Better
// Auth's origin check with a 403 ("Invalid origin").
export function createAuth(
  env: KarsaEnv,
  baseURL: string,
  { disableSignUp = false }: { disableSignUp?: boolean } = {},
) {
  return betterAuth({
    database: env.DB,
    emailAndPassword: {
      enabled: true,
      disableSignUp,
    },
    plugins: [
      admin({
        ac: accessControl,
        roles,
        defaultRole: "customer",
        adminRoles: ["admin", "staff"],
      }),
    ],
    secret: env.BETTER_AUTH_SECRET,
    baseURL,
  });
}
