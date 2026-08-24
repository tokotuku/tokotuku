/// <reference types="@karsa/core/virtual.d.ts" />

import registry from "virtual:karsa/registry";
import type { APIRoute } from "astro";

export const GET: APIRoute = ({ url }) => {
  const hasOrders = registry.moduleNames.includes("orders");
  const hasCatalog = registry.moduleNames.includes("catalog");
  const hasContent = registry.moduleNames.includes("content");
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    ...(hasOrders ? ["Disallow: /cart", "Disallow: /checkout"] : []),
    ...(hasCatalog || hasContent ? ["", `Sitemap: ${url.origin}/sitemap.xml`] : []),
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
