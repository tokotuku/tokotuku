# Publication polished — Karsa project instructions

Use `astro.config.mjs` for brand, palette, locale, and content module configuration. Keep article
routes, draft-safe preview, publishing/archive state, RSS, and sitemap in `@karsa/content`; keep
the app-owned work limited to the shell and deliberate visual polish. Local assets require an
entry in `public/images/manifest.json` and a matching `DESIGN.md` role.

Run local migration/seed, typecheck, lint, build, and desktop/mobile checks when a browser is
available. Keep local secrets in `.dev.vars` and report over- and under-engineering explicitly.
