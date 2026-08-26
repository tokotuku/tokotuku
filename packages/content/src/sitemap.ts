import type { D1Database } from "@cloudflare/workers-types";
import type { SitemapEntry } from "@karsa/core";
import { listPublishedPosts } from "./posts";

export interface ContentSitemapContext {
  request: Request;
  locals: { db: D1Database };
}

/** Sitemap contribution consumed by core's canonical `/sitemap.xml` route. */
export async function getSitemapEntries({
  locals,
}: ContentSitemapContext): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = [{ url: "/blog" }];
  const pageSize = 100;
  let offset = 0;

  // Keep fetching until the final short page so every published post is
  // represented, while each D1 query remains bounded.
  while (true) {
    const posts = await listPublishedPosts(locals.db, { limit: pageSize, offset });
    entries.push(
      ...posts.map((post) => {
        const lastmod = post.updatedAt || post.publishedAt;
        return {
          url: `/blog/${encodeURIComponent(post.slug)}`,
          ...(lastmod ? { lastmod } : {}),
        };
      }),
    );
    if (posts.length < pageSize) break;
    offset += posts.length;
  }

  return entries;
}
