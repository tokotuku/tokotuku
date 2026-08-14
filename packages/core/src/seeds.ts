import path from "node:path";
import type { ModuleSeed } from "./module";

export interface PlannedSeed {
  moduleName: string;
  sql: URL;
}

/** Flattens each module's seed SQL in topo order (the order `modules` is already carried in on ResolvedRegistry). Unlike migrations, seeds aren't numbered or lockfile-tracked -- they're expected to be idempotent and simply re-run every time `db seed` runs. */
export function planSeedSql(modules: { name: string; seeds: ModuleSeed[] }[]): PlannedSeed[] {
  return modules.flatMap((mod) =>
    mod.seeds.map((seed) => ({ moduleName: mod.name, sql: seed.sql })),
  );
}

const EXTENSION_MIME_TYPES: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

export function mimeTypeForFile(fileName: string): string {
  const extension = path.extname(fileName).toLowerCase();
  return EXTENSION_MIME_TYPES[extension] ?? "application/octet-stream";
}

/** Maps a file under a seed's media root onto the R2 object key it uploads to -- `<root>/products/widget.svg` with a `products` subdirectory becomes key `products/widget.svg`. Forward slashes always, regardless of platform path separator. */
export function deriveMediaKey(mediaRoot: string, filePath: string): string {
  return path.relative(mediaRoot, filePath).split(path.sep).join("/");
}

/** Validates a derived R2 key against the registry's merged mediaPrefixes -- the same check the media route applies at request time (see routes/api/images/[...key].ts). Throws rather than silently uploading something that would 404 forever. */
export function assertKeyIsPublic(key: string, mediaPrefixes: string[], moduleName: string): void {
  const isPublic = mediaPrefixes.some((prefix) => key.startsWith(prefix));
  if (!isPublic) {
    throw new Error(
      `Seed media key "${key}" from module "${moduleName}" doesn't match any declared mediaPrefixes ` +
        `(${mediaPrefixes.join(", ") || "none declared"}). The media route would 404 on it -- add a ` +
        `matching mediaPrefixes entry to the module, or move the file under an existing prefix.`,
    );
  }
}
