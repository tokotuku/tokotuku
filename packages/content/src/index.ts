import { defineModule, type ModuleDefinition } from "@karsa/core";

export function content(): ModuleDefinition {
  return defineModule({
    name: "content",
    requires: ["auth"],
    migrations: [{ name: "init", url: new URL("../migrations/0001_init.sql", import.meta.url) }],
    // Covers are public through core's generic R2 media route. Body Markdown
    // never receives a file upload and is rendered by renderMarkdownSafe().
    mediaPrefixes: ["content/"],
    siteRoutes: [
      { pattern: "/blog", entrypoint: "@karsa/content/routes/blog/index.astro" },
      { pattern: "/blog/[slug]", entrypoint: "@karsa/content/routes/blog/[slug].astro" },
      { pattern: "/rss.xml", entrypoint: "@karsa/content/routes/rss.xml.ts" },
    ],
    siteHomeSections: [
      {
        id: "content-latest-posts",
        entrypoint: "@karsa/content/components/site/BlogLatestSection.astro",
        order: 30,
      },
    ],
    adminNav: [
      {
        label: "Posts",
        labelByLocale: { id: "Artikel", en: "Posts" },
        descriptionByLocale: {
          id: "Kelola artikel dan publikasi.",
          en: "Manage articles and publishing.",
        },
        href: "/admin/posts",
        icon: "file",
        order: 40,
      },
    ],
    adminRoutes: [
      { pattern: "/admin/posts", entrypoint: "@karsa/content/routes/admin/posts.astro" },
      { pattern: "/admin/posts/new", entrypoint: "@karsa/content/routes/admin/posts/new.astro" },
      {
        pattern: "/admin/posts/[id]/edit",
        entrypoint: "@karsa/content/routes/admin/posts/[id]/edit.astro",
      },
      {
        pattern: "/admin/posts/[id]/preview",
        entrypoint: "@karsa/content/routes/admin/posts/[id]/preview.astro",
      },
      {
        pattern: "/admin/api/posts/preview",
        entrypoint: "@karsa/content/routes/api/admin/posts/preview.ts",
      },
    ],
    adminDashboardWidgets: [
      {
        id: "content-overview",
        entrypoint: "@karsa/content/components/admin/ContentDashboardWidget.astro",
        area: "main",
        order: 40,
      },
    ],
    sitemapSources: [
      {
        id: "content-posts",
        entrypoint: "@karsa/content/sitemap-source",
        order: 30,
      },
    ],
  });
}

export { postInputFromForm } from "./content-form";
export { renderMarkdownSafe } from "./markdown";
export {
  archivePost,
  type ContentDashboardSummary,
  type ContentPost,
  countPosts,
  createPost,
  findPostById,
  findPostBySlug,
  getContentDashboardSummary,
  getPostById,
  getPostBySlug,
  type ListPostsOptions,
  listAdminPosts,
  listPosts,
  listPublishedPosts,
  normalizeSlug,
  type PostInput,
  type PostStatus,
  postStatuses,
  updatePost,
} from "./posts";
export { getSitemapEntries } from "./sitemap";
