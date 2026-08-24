# Product Polished — Karsa project instructions

This project was scaffolded with `create-karsa`. It is an Astro storefront and
admin app assembled from Karsa modules and running on Cloudflare.

## Working model

- Treat `astro.config.mjs` as the source of truth for brand identity and installed modules.
- Use `@karsa/ui` components and semantic `--karsa-*` theme tokens before writing custom UI.
- Add or remove features with `bunx karsa add <module>` and
  `bunx karsa remove <module>`; do not wire modules by hand.
- Keep module-owned routes, admin navigation, migrations, seeds, and widgets in their
  owning module. Use the Karsa virtual modules when code must work with optional modules.
- Cloudflare bindings are `DB` (D1) and `MEDIA` (R2). Local development uses Wrangler's
  local emulators and does not need a Cloudflare account.

## Data safety

- Migrations are append-only. Never edit or renumber an applied migration.
- Run `bunx karsa db sync` after changing installed modules, then apply local migrations.
- Put store-specific starting data in `seed/` and load it with `bunx karsa db seed`.
- Keep `BETTER_AUTH_SECRET` in `.dev.vars` locally or in Wrangler secrets when deployed.
- Format money and dates with Karsa's locale-aware helpers; do not format them by hand.

## Useful commands

```sh
bun run dev
bun run cf-typegen
bun run db:sync
bun run db:migrate:local
bun run typecheck
bun run lint
```

## AI workflow

Before changing code, inspect the current config, module registry, and nearby implementation.
Use the installed Karsa skills for store-wide builds, UI, modules, and data work. Make
the smallest cohesive change, then run the relevant typecheck, lint, and build commands.
Explain assumptions when a request does not specify the required module or data shape.
