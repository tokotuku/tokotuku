/** Returns the index just past a `//` line comment starting at `i`, or null if there isn't one there. */
function skipLineComment(source: string, i: number): number | null {
  if (source[i] !== "/" || source[i + 1] !== "/") return null;
  let end = i;
  while (end < source.length && source[end] !== "\n") end += 1;
  return end;
}

/** Returns the index just past a `/* *\/` block comment starting at `i`, or null if there isn't one there. */
function skipBlockComment(source: string, i: number): number | null {
  if (source[i] !== "/" || source[i + 1] !== "*") return null;
  let end = i + 2;
  while (end < source.length && !(source[end] === "*" && source[end + 1] === "/")) end += 1;
  return end + 2;
}

/** Returns the index just past a comma at `i` that's followed, ignoring whitespace, by a closing brace or bracket -- or null if it isn't a trailing comma. */
function skipTrailingComma(source: string, i: number): number | null {
  if (source[i] !== ",") return null;
  let next = i + 1;
  while (next < source.length && /\s/.test(source[next] as string)) next += 1;
  return source[next] === "}" || source[next] === "]" ? i + 1 : null;
}

/**
 * Strips `//` and `/* *\/` comments and trailing commas from JSONC,
 * respecting string literals so a `//`, `/*`, or trailing comma inside a
 * JSON string value is left alone -- a naive regex-based stripper would
 * corrupt any config value containing those characters (a URL in a
 * comment, for instance).
 */
export function stripJsonComments(source: string): string {
  const chars: string[] = [];
  let i = 0;
  let inString = false;

  while (i < source.length) {
    const char = source[i] as string;

    if (inString) {
      chars.push(char);
      if (char === "\\") {
        chars.push(source[i + 1] ?? "");
        i += 2;
      } else {
        if (char === '"') inString = false;
        i += 1;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      chars.push(char);
      i += 1;
      continue;
    }

    const skipTo =
      skipLineComment(source, i) ?? skipBlockComment(source, i) ?? skipTrailingComma(source, i);
    if (skipTo !== null) {
      i = skipTo;
      continue;
    }

    chars.push(char);
    i += 1;
  }

  return chars.join("");
}

export interface WranglerConfig {
  d1DatabaseBinding: string;
  r2BucketName: string;
}

interface RawWranglerConfig {
  d1_databases?: { binding?: string }[];
  r2_buckets?: { binding?: string; bucket_name?: string }[];
}

/** Reads just enough of a client's wrangler.jsonc for `karsa db seed` to target the right D1 binding and R2 bucket -- everything else in the file is irrelevant here. */
export function parseWranglerConfig(source: string): WranglerConfig {
  const raw = JSON.parse(stripJsonComments(source)) as RawWranglerConfig;

  const d1Binding = raw.d1_databases?.[0]?.binding;
  if (!d1Binding) {
    throw new Error(
      'wrangler.jsonc has no "d1_databases[0].binding" -- is a D1 database configured?',
    );
  }

  const r2Bucket = raw.r2_buckets?.[0]?.bucket_name;
  if (!r2Bucket) {
    throw new Error(
      'wrangler.jsonc has no "r2_buckets[0].bucket_name" -- is an R2 bucket configured?',
    );
  }

  return { d1DatabaseBinding: d1Binding, r2BucketName: r2Bucket };
}
