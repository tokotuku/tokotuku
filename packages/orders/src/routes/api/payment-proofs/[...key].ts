import { env } from "cloudflare:workers";
import { isPaymentProofType } from "@karsa/core";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ params, locals }) => {
  const key = params["key"];
  if (!key) return new Response("Not found", { status: 404 });

  const { user, canAccessBackoffice } = locals;
  if (!user) return new Response("Unauthorized", { status: 401 });

  const orderNumber = key.split("/")[0];
  const order = orderNumber
    ? await env.DB.prepare(
        `SELECT o.user_id AS userId, p.proof_key AS proofKey, p.upload_state AS uploadState
           FROM orders o LEFT JOIN payments_bank_transfer_proofs p ON p.order_id = o.id
           WHERE o.order_number = ?`,
      )
        .bind(orderNumber)
        .first<{ userId: string | null; proofKey: string | null; uploadState: string | null }>()
    : null;
  if (!order || (order.userId !== user.id && !canAccessBackoffice)) {
    return new Response("Forbidden", { status: 403 });
  }
  if (order.uploadState !== "ready" || order.proofKey !== key) {
    return new Response("Not found", { status: 404 });
  }

  const object = await env.MEDIA.get(`payment-proofs/${key}`);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  headers.set("content-disposition", "attachment");
  headers.set("content-security-policy", "sandbox");
  headers.set("x-content-type-options", "nosniff");
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/octet-stream");
  }
  if (!isPaymentProofType(headers.get("content-type") ?? "")) {
    return new Response("Unsupported media type", { status: 415 });
  }
  headers.set("cache-control", "private, max-age=0, must-revalidate");

  // See packages/core/src/routes/api/images/[...key].ts for why this cast
  // exists — Workers' R2Object.body vs. DOM's BodyInit type collision.
  return new Response(object.body as unknown as BodyInit, { headers });
};
