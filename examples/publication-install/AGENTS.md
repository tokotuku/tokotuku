# Publication install — Karsa project instructions

Use `astro.config.mjs` as the source of truth for brand, auth, content module wiring, and locale.
Keep publication routes and post data in `@karsa/content`; this tier stops before content and
polish. Migrations are append-only and collected into `karsa.migrations.json` with the Karsa CLI.

Run `bun run cf-typegen`, `bun run db:sync`, local migration, typecheck, lint, and build before
reporting completion. Keep local secrets in `.dev.vars`.
