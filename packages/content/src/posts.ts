import type { D1Database } from "@cloudflare/workers-types";

export const postStatuses = ["draft", "published", "archived"] as const;
export type PostStatus = (typeof postStatuses)[number];

interface PostRow {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  body_markdown: string;
  cover_image_key: string | null;
  status: PostStatus;
  author_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  bodyMarkdown: string;
  coverImageKey: string | null;
  status: PostStatus;
  authorId: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PostInput {
  slug: string;
  title: string;
  excerpt: string;
  bodyMarkdown: string;
  coverImageKey?: string | null;
  status: PostStatus;
  authorId?: string | null;
  publishedAt?: string | null;
}

export interface ListPostsOptions {
  limit?: number;
  offset?: number;
  status?: PostStatus | PostStatus[];
  search?: string;
}

export interface ContentDashboardSummary {
  total: number;
  draft: number;
  published: number;
  archived: number;
  recentPosts: ContentPost[];
}

const postColumns =
  "id, slug, title, excerpt, body_markdown, cover_image_key, status, author_id, published_at, created_at, updated_at";

function rowToPost(row: PostRow): ContentPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    bodyMarkdown: row.body_markdown,
    coverImageKey: row.cover_image_key,
    status: row.status,
    authorId: row.author_id,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Normalize a title/slug into the lowercase URL key stored in D1. */
export function normalizeSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

function boundedLimit(limit: number | undefined, fallback: number): number {
  if (!Number.isFinite(limit)) return fallback;
  return Math.min(100, Math.max(1, Math.trunc(limit ?? fallback)));
}

function boundedOffset(offset: number | undefined): number {
  if (!Number.isFinite(offset)) return 0;
  return Math.max(0, Math.trunc(offset ?? 0));
}

function statusFilter(status: ListPostsOptions["status"]): { sql: string; values: string[] } {
  if (!status) return { sql: "", values: [] };
  const values = Array.isArray(status) ? status : [status];
  const valid = values.filter((item): item is PostStatus => postStatuses.includes(item));
  if (!valid.length) return { sql: " AND 1 = 0", values: [] };
  return { sql: ` AND status IN (${valid.map(() => "?").join(", ")})`, values: valid };
}

/** List public posts. Draft and archived rows can never leak through this API. */
export async function listPublishedPosts(
  db: D1Database,
  { limit = 20, offset = 0 }: Pick<ListPostsOptions, "limit" | "offset"> = {},
): Promise<ContentPost[]> {
  const rows = await db
    .prepare(
      `SELECT ${postColumns}
       FROM content_posts
       WHERE status = 'published' AND published_at IS NOT NULL
       ORDER BY datetime(published_at) DESC, id DESC
       LIMIT ? OFFSET ?`,
    )
    .bind(boundedLimit(limit, 20), boundedOffset(offset))
    .all<PostRow>();
  return rows.results.map(rowToPost);
}

/** List rows for the guarded admin table, optionally filtered by status/search. */
export async function listPosts(
  db: D1Database,
  { limit = 25, offset = 0, status, search }: ListPostsOptions = {},
): Promise<ContentPost[]> {
  const filter = statusFilter(status);
  const values: unknown[] = [...filter.values];
  let searchSql = "";
  if (search?.trim()) {
    searchSql = " AND (title LIKE ? OR slug LIKE ? OR excerpt LIKE ?)";
    const query = `%${search.trim()}%`;
    values.push(query, query, query);
  }
  values.push(boundedLimit(limit, 25), boundedOffset(offset));
  const rows = await db
    .prepare(
      `SELECT ${postColumns}
       FROM content_posts
       WHERE 1 = 1${filter.sql}${searchSql}
       ORDER BY datetime(updated_at) DESC, id DESC
       LIMIT ? OFFSET ?`,
    )
    .bind(...values)
    .all<PostRow>();
  return rows.results.map(rowToPost);
}

export async function findPostById(
  db: D1Database,
  id: number,
  { includeUnpublished = false }: { includeUnpublished?: boolean } = {},
): Promise<ContentPost | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  const row = await db
    .prepare(
      `SELECT ${postColumns}
       FROM content_posts
       WHERE id = ?${includeUnpublished ? "" : " AND status = 'published' AND published_at IS NOT NULL"}`,
    )
    .bind(id)
    .first<PostRow>();
  return row ? rowToPost(row) : null;
}

export async function findPostBySlug(
  db: D1Database,
  slug: string,
  { includeUnpublished = false }: { includeUnpublished?: boolean } = {},
): Promise<ContentPost | null> {
  const normalized = normalizeSlug(slug);
  if (!normalized) return null;
  const row = await db
    .prepare(
      `SELECT ${postColumns}
       FROM content_posts
       WHERE slug = ?${includeUnpublished ? "" : " AND status = 'published' AND published_at IS NOT NULL"}`,
    )
    .bind(normalized)
    .first<PostRow>();
  return row ? rowToPost(row) : null;
}

export async function countPosts(db: D1Database, status?: PostStatus): Promise<number> {
  const row = await db
    .prepare(
      status
        ? "SELECT COUNT(*) AS count FROM content_posts WHERE status = ?"
        : "SELECT COUNT(*) AS count FROM content_posts",
    )
    .bind(...(status ? [status] : []))
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export async function getContentDashboardSummary(db: D1Database): Promise<ContentDashboardSummary> {
  const counts = await db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft,
         SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
         SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) AS archived
       FROM content_posts`,
    )
    .first<{ total: number; draft: number; published: number; archived: number }>();
  const recentPosts = await listPosts(db, { limit: 5 });
  return {
    total: counts?.total ?? 0,
    draft: counts?.draft ?? 0,
    published: counts?.published ?? 0,
    archived: counts?.archived ?? 0,
    recentPosts,
  };
}

function ensureInput(input: PostInput): PostInput & { slug: string; title: string } {
  const title = input.title.trim();
  const slug = normalizeSlug(input.slug || title);
  if (!title) throw new Error("Post title is required.");
  if (!slug) throw new Error("Post slug is required.");
  if (!postStatuses.includes(input.status)) throw new Error("Post status is invalid.");
  return {
    ...input,
    slug,
    title,
    excerpt: input.excerpt.trim(),
    bodyMarkdown: input.bodyMarkdown,
  };
}

export async function createPost(db: D1Database, input: PostInput): Promise<number> {
  const normalized = ensureInput(input);
  const publishedAt =
    normalized.status === "published" ? (normalized.publishedAt ?? new Date().toISOString()) : null;
  const row = await db
    .prepare(
      `INSERT INTO content_posts
        (slug, title, excerpt, body_markdown, cover_image_key, status, author_id, published_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       RETURNING id`,
    )
    .bind(
      normalized.slug,
      normalized.title,
      normalized.excerpt,
      normalized.bodyMarkdown,
      normalized.coverImageKey ?? null,
      normalized.status,
      normalized.authorId ?? null,
      publishedAt,
    )
    .first<{ id: number }>();
  if (!row) throw new Error("Post could not be created.");
  return row.id;
}

export async function updatePost(db: D1Database, id: number, input: PostInput): Promise<void> {
  const normalized = ensureInput(input);
  const existing = await db
    .prepare("SELECT published_at, author_id, cover_image_key FROM content_posts WHERE id = ?")
    .bind(id)
    .first<{
      published_at: string | null;
      author_id: string | null;
      cover_image_key: string | null;
    }>();
  if (!existing) throw new Error("Post not found.");
  const publishedAt =
    normalized.status === "published"
      ? (normalized.publishedAt ?? existing.published_at ?? new Date().toISOString())
      : null;
  await db
    .prepare(
      `UPDATE content_posts SET
        slug = ?, title = ?, excerpt = ?, body_markdown = ?, cover_image_key = ?,
        status = ?, published_at = ?, updated_at = datetime('now')
       WHERE id = ?`,
    )
    .bind(
      normalized.slug,
      normalized.title,
      normalized.excerpt,
      normalized.bodyMarkdown,
      normalized.coverImageKey === undefined ? existing.cover_image_key : normalized.coverImageKey,
      normalized.status,
      publishedAt,
      id,
    )
    .run();
}

export async function archivePost(db: D1Database, id: number): Promise<void> {
  await db
    .prepare(
      "UPDATE content_posts SET status = 'archived', published_at = NULL, updated_at = datetime('now') WHERE id = ?",
    )
    .bind(id)
    .run();
}

// Aliases keep the public vocabulary pleasant for consumers that prefer
// `getPost*` names while the route implementation uses the list/find names.
export const getPostById = findPostById;
export const getPostBySlug = findPostBySlug;
export const listAdminPosts = listPosts;
