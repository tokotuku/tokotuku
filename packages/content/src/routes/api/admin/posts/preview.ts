import type { APIRoute } from "astro";
import { renderMarkdownSafe } from "../../../../markdown";

/** Authenticated Markdown preview endpoint used by the post editor. */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return Response.json({ error: "Authentication required" }, { status: 401 });
  let markdown = "";
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload: unknown = await request.json().catch(() => null);
    if (payload && typeof payload === "object") {
      const value =
        (payload as { markdown?: unknown; body_markdown?: unknown }).markdown ??
        (payload as { body_markdown?: unknown }).body_markdown;
      if (typeof value === "string") markdown = value;
    }
  } else {
    const form = await request.formData().catch(() => null);
    const value = form?.get("markdown") ?? form?.get("body_markdown");
    if (typeof value === "string") markdown = value;
  }
  if (markdown.length > 200_000)
    return Response.json({ error: "Markdown is too long" }, { status: 413 });
  return Response.json(
    { html: renderMarkdownSafe(markdown) },
    { headers: { "Cache-Control": "no-store" } },
  );
};

export const ALL: APIRoute = async () => new Response("Method not allowed", { status: 405 });
