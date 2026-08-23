export interface CursorPageInfo {
  startCursor: string | null;
  endCursor: string | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CursorPage<T> {
  items: T[];
  pageInfo: CursorPageInfo;
}

export interface CursorKeySet {
  [key: string]: string | number | null;
}

export interface CursorPayload {
  v: 1;
  domain: string;
  keys: CursorKeySet;
  filters: string;
}

export class CursorError extends Error {
  readonly code = "INVALID_CURSOR";

  constructor(message = "Invalid cursor") {
    super(message);
    this.name = "CursorError";
  }
}

export function normalizePageSize(size = 25): number {
  if (!Number.isInteger(size) || size < 1 || size > 100) {
    throw new RangeError("Cursor page size must be an integer between 1 and 100.");
  }
  return size;
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decodeBase64Url(value: string): string {
  try {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
    return new TextDecoder().decode(
      Uint8Array.from(binary, (character) => character.charCodeAt(0)),
    );
  } catch {
    throw new CursorError("Malformed cursor encoding.");
  }
}

export function encodeCursor(input: Omit<CursorPayload, "v">): string {
  if (!input.domain.trim() || !input.filters.trim())
    throw new CursorError("Cursor metadata is incomplete.");
  return encodeBase64Url(JSON.stringify({ ...input, v: 1 } satisfies CursorPayload));
}

function validateCursorKeys(value: unknown): CursorKeySet {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CursorError("Cursor sort keys are missing.");
  }

  const keys = value as Record<string, unknown>;
  for (const key of Object.keys(keys)) {
    const item = keys[key];
    if (item !== null && typeof item !== "string" && typeof item !== "number") {
      throw new CursorError("Cursor sort keys are invalid.");
    }
  }
  return keys as CursorKeySet;
}

export function decodeCursor(cursor: string): CursorPayload {
  if (!cursor || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw new CursorError("Malformed cursor.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeBase64Url(cursor));
  } catch (error) {
    if (error instanceof CursorError) throw error;
    throw new CursorError("Malformed cursor payload.");
  }

  if (!parsed || typeof parsed !== "object") throw new CursorError("Malformed cursor payload.");
  const payload = parsed as Partial<CursorPayload>;
  if (
    payload.v !== 1 ||
    typeof payload.domain !== "string" ||
    typeof payload.filters !== "string"
  ) {
    throw new CursorError("Unsupported cursor version.");
  }
  if (!payload.domain.trim() || !payload.filters.trim()) {
    throw new CursorError("Cursor metadata is incomplete.");
  }
  return { ...payload, keys: validateCursorKeys(payload.keys) } as CursorPayload;
}

export function assertCursor(
  cursor: string,
  expected: { domain: string; filters: string },
): CursorPayload {
  const payload = decodeCursor(cursor);
  if (payload.domain !== expected.domain || payload.filters !== expected.filters) {
    throw new CursorError("Cursor does not match this list.");
  }
  return payload;
}

/**
 * Hash the stable filter JSON instead of embedding filter values in the
 * cursor. Search filters can contain customer email/phone, so even an
 * unsigned transport token must not expose them through base64 decoding.
 */
export function cursorFilterSignature(filters: Record<string, unknown>): string {
  const normalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(normalize);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, normalize(nested)]),
    );
  };

  const canonical = JSON.stringify(normalize(filters));
  let hash = 2166136261;
  for (const byte of new TextEncoder().encode(canonical)) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
