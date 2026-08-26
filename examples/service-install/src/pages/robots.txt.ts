/// <reference types="@karsa/core/virtual.d.ts" />

import registry from "virtual:karsa/registry";
import type { APIRoute } from "astro";

export const GET: APIRoute = ({ url }) => {
  const hasOrders = registry.moduleNames.includes("orders");
  const hasCatalog = registry.moduleNames.includes("catalog");
  const hasProductOrders = registry.clientConfig.orders?.presentation === "orders";
  const hasProductCatalog = registry.clientConfig.catalog?.presentation === "products";
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    ...(hasOrders && hasProductOrders ? ["Disallow: /cart", "Disallow: /checkout"] : []),
    ...(hasCatalog && hasProductCatalog ? ["", `Sitemap: ${url.origin}/sitemap.xml`] : []),
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
