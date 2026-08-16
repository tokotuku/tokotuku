export interface ResolvedUser {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
}

export interface ResolvedSession {
  user: ResolvedUser | null;
  canAccessBackoffice: boolean;
}

export type SessionResolver = (request: Request) => Promise<ResolvedSession>;

let sessionResolver: SessionResolver | null = null;

/**
 * Registers how the middleware resolves the current request's session.
 * Core has no opinion on the auth library — until @takontuku/auth exists as
 * its own package, the app registers this itself (see
 * apps/example/src/lib/session-resolver.ts). No resolver registered means
 * every request is treated as anonymous, not an error.
 */
export function registerSessionResolver(resolver: SessionResolver): void {
  sessionResolver = resolver;
}

export async function resolveSession(request: Request): Promise<ResolvedSession> {
  if (!sessionResolver) return { user: null, canAccessBackoffice: false };
  return sessionResolver(request);
}

/** Test-only: clears the registered resolver so suites don't leak state between runs. */
export function resetSessionResolver(): void {
  sessionResolver = null;
}
