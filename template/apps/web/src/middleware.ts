import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";
import { isSetupComplete } from "./lib/setup";

function isDocumentRoute(pathname: string): boolean {
  return !pathname.startsWith("/api/") && !pathname.split("/").at(-1)?.includes(".");
}

export const onRequest = defineMiddleware(async (context, next) => {
  if (!isDocumentRoute(context.url.pathname)) return next();

  const setupComplete = await isSetupComplete(env.DB);
  if (!setupComplete && context.url.pathname !== "/setup") {
    return context.redirect("/setup", 302);
  }
  if (setupComplete && context.url.pathname === "/setup") {
    return context.redirect("/login", 302);
  }

  return next();
});
