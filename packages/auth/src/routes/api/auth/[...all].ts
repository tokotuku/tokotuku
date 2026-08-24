import { env } from "cloudflare:workers";
import registry from "virtual:karsa/registry";
import type { APIRoute } from "astro";
import { createAuth } from "../../../auth";

export const ALL: APIRoute = async ({ request }) => {
  const registration = registry.clientConfig["auth"]?.["registration"];
  const auth = createAuth(env, new URL(request.url).origin, {
    disableSignUp: registration !== "public",
  });
  return auth.handler(request);
};
