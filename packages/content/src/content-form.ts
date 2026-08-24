import type { R2Bucket } from "@cloudflare/workers-types";
import { normalizeSlug, type PostInput, postStatuses } from "./posts";

const MAX_COVER_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function requiredText(form: FormData, name: string, label: string): string {
  const value = String(form.get(name) ?? "").trim();
  if (!value) throw new Error(`${label} is required.`);
  return value;
}

function optionalText(form: FormData, name: string): string {
  return String(form.get(name) ?? "").trim();
}

function extensionFor(file: File): string {
  const extension = file.name
    .split(".")
    .pop()
    ?.replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
  if (extension && /^[a-z0-9]{1,8}$/.test(extension)) return extension;
  const fromMime = file.type
    .split("/")[1]
    ?.replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
  return fromMime && /^[a-z0-9]{1,8}$/.test(fromMime) ? fromMime : "bin";
}

/** Parse an admin editor form and upload only its optional cover to R2. */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: validation branches map directly to editor field constraints
export async function postInputFromForm(
  form: FormData,
  media: R2Bucket,
  existingCoverImageKey?: string | null,
  authorId?: string | null,
): Promise<PostInput> {
  const title = requiredText(form, "title", "Post title");
  const slug = normalizeSlug(optionalText(form, "slug") || title);
  if (!slug) throw new Error("Post slug is required.");
  const excerpt = optionalText(form, "excerpt");
  const bodyMarkdown = String(form.get("body_markdown") ?? form.get("bodyMarkdown") ?? "");
  const statusValue = optionalText(form, "status") || "draft";
  if (!postStatuses.includes(statusValue as (typeof postStatuses)[number])) {
    throw new Error("Post status is invalid.");
  }
  if (title.length > 180) throw new Error("Post title is too long.");
  if (excerpt.length > 600) throw new Error("Post excerpt is too long.");
  if (bodyMarkdown.length > 200_000) throw new Error("Post body is too long.");

  let coverImageKey = existingCoverImageKey ?? null;
  const cover = form.get("cover_image") ?? form.get("cover");
  if (cover instanceof File && cover.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.has(cover.type)) throw new Error("Cover must be a supported image.");
    if (cover.size > MAX_COVER_BYTES) throw new Error("Cover must be 8 MB or smaller.");
    coverImageKey = `content/${crypto.randomUUID()}.${extensionFor(cover)}`;
    await media.put(coverImageKey, await cover.arrayBuffer(), {
      httpMetadata: {
        contentType: cover.type,
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: {
        purpose: "content-cover",
      },
    });
  }

  return {
    title,
    slug,
    excerpt,
    bodyMarkdown,
    coverImageKey,
    status: statusValue as (typeof postStatuses)[number],
    ...(authorId === undefined ? {} : { authorId }),
  };
}
