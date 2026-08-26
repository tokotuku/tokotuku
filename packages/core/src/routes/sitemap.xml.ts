/// <reference path="../virtual.d.ts" />
import sources from "virtual:karsa/sitemap-sources";
import type { APIRoute } from "astro";
import type { SitemapEntry } from "../module";

const escapeXml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character] ?? character,
  );

export const GET: APIRoute = async ({ request, locals }) => {
  const origin = new URL(request.url).origin;
  const contributed = await Promise.all(
    sources.map(({ module }) => module.getSitemapEntries({ request, locals })),
  );
  const entries: SitemapEntry[] = [{ url: "/" }, ...contributed.flat()];
  const unique = [
    ...new Map(entries.map((entry) => [new URL(entry.url, origin).href, entry])).entries(),
  ];
  const body = unique
    .map(([absoluteUrl, entry]) => {
      const fields = [`<loc>${escapeXml(absoluteUrl)}</loc>`];
      if (entry.lastmod) fields.push(`<lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
      if (entry.changefreq) fields.push(`<changefreq>${entry.changefreq}</changefreq>`);
      if (entry.priority !== undefined) fields.push(`<priority>${entry.priority}</priority>`);
      return `<url>${fields.join("")}</url>`;
    })
    .join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`,
    {
      headers: { "content-type": "application/xml; charset=utf-8" },
    },
  );
};
