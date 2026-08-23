import { env } from "cloudflare:workers";
import { findAdminOrderDetail } from "../../../../orders";

export async function GET({ params }: { params: Record<string, string | undefined> }) {
  const id = Number(params["id"]);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "Invalid order id" }, { status: 400 });
  }
  const order = await findAdminOrderDetail(env.DB, id);
  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
  return Response.json(order);
}
