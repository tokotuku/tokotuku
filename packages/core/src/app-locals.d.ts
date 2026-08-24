declare namespace App {
  interface Locals {
    /** The D1 binding, resolved once in middleware from `cloudflare:workers`. */
    db: import("@cloudflare/workers-types").D1Database;
    /** The full Cloudflare env, for bindings core doesn't yet abstract (e.g. R2 before task 0.6). */
    env: import("./env").KarsaEnv;
    /** Brand/locale config resolved from the client's `karsa()` integration options. */
    brand: import("./integration").KarsaBrand;
    /** The signed-in user, or null when the request is anonymous. */
    user: import("./session").ResolvedUser | null;
    /** Whether `user` may access guarded (`/admin/*`-style) routes. */
    canAccessBackoffice: boolean;
  }
}
