import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { createAuth } from "../../../lib/auth";
import { canAccessBackoffice } from "../../../lib/roles";

export const GET: APIRoute = async ({ params, request }) => {
  const key = params.key;
  if (!key) return new Response("Not found", { status: 404 });

  const auth = createAuth(env, new URL(request.url).origin);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const orderNumber = key.split("/")[0];
  const isOwner = orderNumber
    ? await env.DB.prepare("SELECT 1 FROM orders WHERE order_number = ? AND user_id = ?")
        .bind(orderNumber, session.user.id)
        .first()
    : null;
  if (!isOwner && !canAccessBackoffice(session.user.role))
    return new Response("Forbidden", { status: 403 });

  const object = await env.PRODUCT_IMAGES.get(`payment-proofs/${key}`);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/octet-stream");
  }
  headers.set("cache-control", "private, max-age=0, must-revalidate");

  return new Response(object.body, { headers });
};
