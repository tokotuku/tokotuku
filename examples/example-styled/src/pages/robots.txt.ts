import type { APIRoute } from "astro";

export const GET: APIRoute = ({ url }) => {
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /cart",
    "Disallow: /checkout",
    "",
    `Sitemap: ${url.origin}/sitemap.xml`,
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
