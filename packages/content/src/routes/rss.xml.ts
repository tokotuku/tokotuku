import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { renderMarkdownSafe } from "../markdown";
import { listPublishedPosts } from "../posts";

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export const GET: APIRoute = async ({ url }) => {
  const posts = await listPublishedPosts(env.DB, { limit: 50 });
  const blogUrl = new URL("/blog", url.origin).toString();
  const items = posts
    .map((post) => {
      const link = new URL(`/blog/${encodeURIComponent(post.slug)}`, url.origin).toString();
      return [
        "    <item>",
        `      <title>${xmlEscape(post.title)}</title>`,
        `      <link>${xmlEscape(link)}</link>`,
        `      <guid isPermaLink="true">${xmlEscape(link)}</guid>`,
        `      <description>${xmlEscape(post.excerpt)}</description>`,
        `      <content:encoded><![CDATA[${renderMarkdownSafe(post.bodyMarkdown).replaceAll("]]>", "]]]]><![CDATA[>")}]]></content:encoded>`,
        post.publishedAt
          ? `      <pubDate>${xmlEscape(new Date(post.publishedAt).toUTCString())}</pubDate>`
          : "",
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">',
    "  <channel>",
    "    <title>Blog</title>",
    `    <link>${xmlEscape(blogUrl)}</link>`,
    "    <description>Latest published posts</description>",
    items,
    "  </channel>",
    "</rss>",
  ].join("\n");
  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
};
