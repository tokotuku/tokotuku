import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ params, locals }) => {
  const key = params["key"];
  if (!key) return new Response("Not found", { status: 404 });

  const { user, canAccessBackoffice } = locals;
  if (!user) return new Response("Unauthorized", { status: 401 });

  const orderNumber = key.split("/")[0];
  const isOwner = orderNumber
    ? await env.DB.prepare("SELECT 1 FROM orders WHERE order_number = ? AND user_id = ?")
        .bind(orderNumber, user.id)
        .first()
    : null;
  if (!isOwner && !canAccessBackoffice) return new Response("Forbidden", { status: 403 });

  const object = await env.MEDIA.get(`payment-proofs/${key}`);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/octet-stream");
  }
  headers.set("cache-control", "private, max-age=0, must-revalidate");

  // See packages/core/src/routes/api/images/[...key].ts for why this cast
  // exists — Workers' R2Object.body vs. DOM's BodyInit type collision.
  return new Response(object.body as unknown as BodyInit, { headers });
};
