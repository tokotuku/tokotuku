import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { createAuth } from "../../../auth";

export const ALL: APIRoute = async ({ request }) => {
  const auth = createAuth(env, new URL(request.url).origin);
  return auth.handler(request);
};
