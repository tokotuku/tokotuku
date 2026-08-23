import { env } from "cloudflare:workers";
import { findProductById } from "../../../../products";

export async function GET({ params }: { params: Record<string, string | undefined> }) {
  const id = Number(params["id"]);
  if (!Number.isInteger(id) || id <= 0)
    return Response.json({ error: "Invalid product id" }, { status: 400 });
  const product = await findProductById(env.DB, id, { includeInactive: true });
  if (!product) return Response.json({ error: "Product not found" }, { status: 404 });
  return Response.json(product);
}
