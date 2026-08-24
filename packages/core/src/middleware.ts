/// <reference path="./app-locals.d.ts" />
/// <reference path="./virtual.d.ts" />

import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";
import brand from "virtual:karsa/config";
import registry from "virtual:karsa/registry";
// Imported from the package's own main specifier, not a relative path: this
// file ships as raw source (it needs the consumer's own astro:middleware /
// cloudflare:workers resolution), while callers like an app's session-resolver
// wiring go through the bundled `dist/index.js`. Two different resolved
// paths would mean two separate module instances — and two separate copies
// of session.ts's module-scope resolver, so a registration made against one
// would be invisible to the other. Importing through the same package
// specifier here keeps everyone on the one instance.
import { checkSetupGate, type ResolvedSession, resolveSession } from "@karsa/core";
import type { APIContext } from "astro";

type Redirect = APIContext["redirect"];

function isDocumentRoute(pathname: string): boolean {
  return !pathname.startsWith("/api/") && !pathname.split("/").at(-1)?.includes(".");
}

// Isolate-scoped: once setup is confirmed complete, never re-check. A
// `false` result is never cached — the whole point is to keep checking
// until an admin actually exists.
let setupCompleteCache = false;

async function isSetupComplete(): Promise<boolean | null> {
  if (setupCompleteCache) return true;
  const result = await checkSetupGate();
  if (result) setupCompleteCache = true;
  return result;
}

/** Redirects to/from /setup while a registered setup gate is incomplete. Returns null otherwise. */
async function applySetupGateRedirect(context: {
  url: URL;
  redirect: Redirect;
}): Promise<Response | null> {
  if (!isDocumentRoute(context.url.pathname)) return null;
  const setupComplete = await isSetupComplete();
  if (setupComplete === null) return null;
  if (!setupComplete && context.url.pathname !== "/setup") return context.redirect("/setup", 302);
  if (setupComplete && context.url.pathname === "/setup") return context.redirect("/login", 302);
  return null;
}

/** Redirects an unauthenticated or under-privileged request away from a guarded prefix. */
function applyBackofficeGuard(
  pathname: string,
  session: ResolvedSession,
  redirect: Redirect,
): Response | null {
  const guarded = registry.guardedPrefixes.some((prefix) => pathname.startsWith(prefix));
  if (!guarded) return null;
  if (!session.user) return redirect(`/login?next=${encodeURIComponent(pathname)}`, 302);
  if (!session.canAccessBackoffice) return redirect("/403", 302);
  return null;
}

// Better Auth's own handler owns this prefix end-to-end and never reads
// locals.user — resolving a session here first would just be a wasted
// lookup ahead of every sign-in/sign-out/session call.
const AUTH_API_PREFIX = "/api/auth/";

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.db = env.DB;
  context.locals.env = env;
  context.locals.brand = brand;

  if (context.url.pathname.startsWith(AUTH_API_PREFIX)) {
    context.locals.user = null;
    context.locals.canAccessBackoffice = false;
    return next();
  }

  const session = await resolveSession(context.request);
  context.locals.user = session.user;
  context.locals.canAccessBackoffice = session.canAccessBackoffice;

  const setupRedirect = await applySetupGateRedirect(context);
  if (setupRedirect) return setupRedirect;

  const guardRedirect = applyBackofficeGuard(context.url.pathname, session, context.redirect);
  if (guardRedirect) return guardRedirect;

  return next();
});
