---
name: takontuku-data
description: Work with a Takontuku store's database, migrations, seed data, media storage, and local secrets. Use when adding or changing a table, when migrations fail or look out of order, when seeding a store with starting data, when uploading media, or when setting BETTER_AUTH_SECRET and other env values.
license: MIT
metadata:
  package: "@takontuku/core"
---

# Takontuku data

A Takontuku store runs on Cloudflare: D1 for the database, R2 for media. Both are
reached through bindings, never through a connection string.

| Binding | What it is | Note |
| --- | --- | --- |
| `DB` | D1 database | |
| `MEDIA` | R2 bucket | Deliberately not `IMAGES` — that name collides with the Astro Cloudflare adapter's own binding |

## Migrations are append-only

`migrations/` holds SQL collected from every installed module, and
`takontuku.migrations.json` records what has already been emitted and at which sequence
number. Two rules follow, and breaking either corrupts real stores:

1. **Never edit or renumber a migration that has been applied.** Change the schema with a
   new migration instead.
2. **Never hand-write files into `migrations/`** for module tables. Run `db sync`, which
   copies each installed module's migrations in dependency order and assigns strictly
   increasing sequence numbers.

Your own store-specific migrations are fine to add by hand — just give them a number
higher than anything already there, and never reuse one.

```bash
bunx takontuku db sync                             # collect module migrations
bunx wrangler d1 migrations apply DB --local       # apply locally
bunx wrangler d1 migrations apply DB --remote      # apply to the deployed database
```

## Local development needs no Cloudflare account

`wrangler.jsonc` ships with a placeholder `database_id` of all zeros. That is enough for
everything `--local`: wrangler simulates D1 and R2 on disk under `.wrangler/`. You only
need `wrangler d1 create` and `wrangler r2 bucket create` — and the real UUID pasted into
`wrangler.jsonc` — before the first `--remote` command or `wrangler deploy`.

## Seed data

```bash
bunx takontuku db seed
```

This runs each installed module's own seeds, then the store's own `seed/` directory if
present: SQL files in name order, then anything under `seed/media/` uploaded to R2. That
second part is the important one — `seed/` is where a real store's starting catalog,
categories, or settings belong. Seed data is not necessarily demo data.

Seeding is `--local` only, by design. There is no remote seeding path, so a store's
starting data can never be pushed to production by accident. Load real production data
with migrations or your own scripts.

## Secrets

`BETTER_AUTH_SECRET` is required. `@takontuku/auth` passes it straight to better-auth,
which falls back to a hard-coded public default when it is missing — so a store without
it signs its sessions with a secret everyone knows.

- Local: `.dev.vars` in the project root, gitignored. A scaffold generates a random one.
- Deployed: `bunx wrangler secret put BETTER_AUTH_SECRET`. `.dev.vars` is never uploaded.

## Types

`worker-configuration.d.ts` is generated, not written:

```bash
bun run cf-typegen
```

Re-run it after changing bindings in `wrangler.jsonc`, or `astro check` will not resolve
`cloudflare:workers`.

## Reaching the database in code

Route handlers get bindings from the Cloudflare runtime:

```ts
import { env } from "cloudflare:workers";

const rows = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(id).all();
```
