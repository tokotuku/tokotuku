import { env } from "cloudflare:workers";
import { listProducts } from "@takontuku/catalog";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ url }) => {
  const products = await listProducts(env.DB);
  const staticPaths = ["/", "/products"];
  const productPaths = products.map((product) => `/products/${product.id}`);
  const urls = [...staticPaths, ...productPaths].map((path) => `${url.origin}${path}`);

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((loc) => `  <url><loc>${loc}</loc></url>`),
    "</urlset>",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
