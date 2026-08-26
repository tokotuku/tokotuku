---
name: karsa-data
description: Use when changing a Karsa site's database, migrations, seed data, media storage, Cloudflare bindings, or local/deployed secrets. Keep data work append-only, local-first, and evidenced.
license: MIT
metadata:
  package: "@karsa/core"
---

# Karsa data

Use this skill for data work, not for inventing a second persistence layer. Karsa reaches Cloudflare D1 and R2 through runtime bindings; a connection string is not part of the contract.

| Binding | Role | Safety note |
| --- | --- | --- |
| `DB` | D1 database | Apply local migrations before remote migrations. |
| `MEDIA` | R2 bucket | Public keys must match an installed module's `mediaPrefixes`. |

## Migrations are append-only

`migrations/` collects SQL from installed modules. `karsa.migrations.json` records emitted module migrations and their sequence. Never edit, renumber, or delete an applied migration. Add a new migration for a schema change.

Do not hand-write a module migration in the host application's `migrations/`; run the CLI so dependency order and the manifest remain aligned:

```sh
bunx karsa db sync
bunx wrangler d1 migrations apply DB --local
bunx wrangler d1 migrations apply DB --remote
```

The CLI sync step does not apply SQL. Review its diff before applying it. A missing or inconsistent manifest is a stop condition, not an invitation to guess sequence numbers.

## Seeds and media

```sh
bunx karsa db seed
```

Seeding is local-only. It runs installed module seeds, then project SQL under `seed/` in name order, and uploads `seed/media/` files to R2. Seed SQL should be idempotent; seed data is starting data, not a license to publish credentials or fabricated production metrics.

When adding media, derive the key from the declared media root and verify it falls under a registry `mediaPrefixes`. A key outside that allowlist must fail before upload rather than becoming a URL that can never resolve.

## Secrets and types

- Keep `BETTER_AUTH_SECRET` in a gitignored `.dev.vars` file locally.
- Set deployed secrets with `bunx wrangler secret put BETTER_AUTH_SECRET`.
- Never commit tokens, real passwords, or production exports.
- Regenerate Cloudflare types after changing `wrangler.jsonc`:

```sh
bun run cf-typegen
```

Route handlers read bindings from the runtime:

```ts
import { env } from "cloudflare:workers";

const rows = await env.DB.prepare("SELECT * FROM records WHERE id = ?").bind(id).all();
```

## Evidence

Report the migration plan, manifest change, seed files, media keys, binding/secret assumptions, and the exact local checks run. If remote state is involved, require explicit authorization and record the remote command output.
