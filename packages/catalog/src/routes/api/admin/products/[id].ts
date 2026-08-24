import { env } from "cloudflare:workers";
import registry from "virtual:karsa/registry";
import { findItemById } from "../../../../catalog-items";

export async function GET({ params }: { params: Record<string, string | undefined> }) {
  const id = Number(params["id"]);
  const presentation =
    registry.clientConfig["catalog"]?.["presentation"] === "services" ? "services" : "products";
  const noun = presentation === "services" ? "service" : "product";
  if (!Number.isInteger(id) || id <= 0)
    return Response.json({ error: `Invalid ${noun} id` }, { status: 400 });
  const item = await findItemById(env.DB, id, { includeInactive: true, presentation });
  if (!item)
    return Response.json(
      { error: `${noun[0]?.toUpperCase()}${noun.slice(1)} not found` },
      { status: 404 },
    );
  return Response.json(item);
}
