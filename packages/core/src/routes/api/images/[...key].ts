import { env } from "cloudflare:workers";
import registry from "virtual:takontuku/registry";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ params }) => {
  const key = params["key"];

  if (!key) {
    return new Response("Not found", { status: 404 });
  }

  const isPublic = registry.mediaPrefixes.some((prefix) => key.startsWith(prefix));
  if (!isPublic) {
    return new Response("Not found", { status: 404 });
  }

  const object = await env.MEDIA.get(key);

  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/octet-stream");
  }
  headers.set("cache-control", "public, max-age=3600");

  // Workers' R2Object.body is a distinct global ReadableStream from DOM's
  // BodyInit — same-shaped at runtime, incompatible only in the type
  // checker (workers-types declares its own ReadableStream global).
  return new Response(object.body as unknown as BodyInit, { headers });
};
