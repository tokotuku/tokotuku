function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/**
 * Keep a post-authentication destination on this application origin.
 * WHATWG URL parsing treats backslashes as separators, so the raw value is
 * rejected before resolution as well as checked after resolution.
 */
export function safeInternalPath(
  requested: string | null | undefined,
  origin: string,
  fallback = "/admin",
): string {
  if (!requested || requested.length > 2048 || hasControlCharacters(requested)) return fallback;
  if (!requested.startsWith("/") || requested.startsWith("//")) return fallback;
  if (
    requested.includes("\\") ||
    /%5c/i.test(requested) ||
    /%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(requested)
  ) {
    return fallback;
  }

  try {
    const base = new URL(origin);
    const resolved = new URL(requested, base);
    if (resolved.origin !== base.origin) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}
