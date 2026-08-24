# Publication content — Karsa project instructions

Use `astro.config.mjs` as the source of truth. Keep article records, status transitions, preview,
RSS, and sitemap ownership in `@karsa/content`; app-owned pages compose the site shell only.
Seed SQL must be local-only and idempotent. Draft and archived posts must never appear on public
blog routes or RSS.

Run `bun run db:sync`, local migration and seed, typecheck, lint, and build. Keep local secrets in
`.dev.vars` and report the exact checks and any deferred editorial input.
