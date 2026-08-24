import { env } from "cloudflare:workers";
import { findItemsByIds } from "@karsa/catalog";
import { mediaUrl } from "@karsa/core";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ url }) => {
  const ids = (url.searchParams.get("ids") ?? "")
    .split(",")
    .map((raw) => Number(raw))
    .filter((id) => Number.isInteger(id) && id > 0);

  const products = ids.length ? await findItemsByIds(env.DB, ids) : [];

  return new Response(
    JSON.stringify({
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        priceCents: product.priceCents,
        imageUrl: mediaUrl(product.imageKey),
        stock: product.stock,
      })),
    }),
    { headers: { "content-type": "application/json" } },
  );
};
