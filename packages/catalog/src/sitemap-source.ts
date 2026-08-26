import { env } from "cloudflare:workers";
import registry from "virtual:karsa/registry";
import type { SitemapEntry } from "@karsa/core";
import { listItems } from "./catalog-items";

export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  const presentation =
    registry.clientConfig["catalog"]?.["presentation"] === "services" ? "services" : "products";
  const base = presentation === "services" ? "/services" : "/products";
  const entries: SitemapEntry[] = [{ url: base, changefreq: "weekly", priority: 0.8 }];
  let after: string | undefined;
  do {
    const page = await listItems(env.DB, {
      activeOnly: true,
      pageSize: 100,
      presentation,
      ...(after ? { after } : {}),
    });
    entries.push(
      ...page.items.map((item) => ({ url: `${base}/${item.id}`, changefreq: "weekly" as const })),
    );
    after = page.pageInfo.hasNextPage ? (page.pageInfo.endCursor ?? undefined) : undefined;
  } while (after);
  return entries;
}
