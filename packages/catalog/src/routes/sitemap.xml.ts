import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { listProducts, type Product } from "../products";

export const GET: APIRoute = async ({ url }) => {
  const products: Product[] = [];
  let after: string | undefined;
  do {
    const page = after
      ? await listProducts(env.DB, { activeOnly: true, pageSize: 100, after })
      : await listProducts(env.DB, { activeOnly: true, pageSize: 100 });
    products.push(...page.items);
    after = page.pageInfo.hasNextPage ? (page.pageInfo.endCursor ?? undefined) : undefined;
  } while (after);
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
