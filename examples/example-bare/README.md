# example-bare

**What this proves:** what `bunx create-tokotuku` gives you, unmodified. No demo data, no theme
overrides. This is one of three example apps under the repo root's `examples/` directory — see the
[root README's Examples section](../../README.md#examples) for how the three relate.

The only differences from a real `create-tokotuku` scaffold are cosmetic, so this stays
reproducible without a registry: `@tokotuku/*` dependencies point at `workspace:*` here instead of
a published version (this repo's own packages, not a separate install), and `.npmrc` was removed
since nothing needs to be fetched from Verdaccio.

Run Cloudflare resource commands (`wrangler`, `db:*`) from this directory. Run it through Moon from
the repository root with `bun run example-bare` (dev server on port 4410, distinct from
`example-seeded` on 4420 and `example-styled` on 4430 — all three can run at the same time).

## Local setup

Create `.dev.vars` with a local Better Auth secret:

```sh
openssl rand -base64 32
```

```dotenv
BETTER_AUTH_SECRET=<generated-value>
```

Then initialize the local Cloudflare resources:

```sh
bun run cf-typegen
bun run db:migrate:local
```

From the repository root:

```sh
bun run example-bare
```

Open `http://localhost:4410/setup` and create the first administrator — a one-time bootstrap route
that redirects to login permanently once an administrator exists.

At this point `/products` renders the empty state: zero products, because nothing has been
seeded. That emptiness is the point of this app — compare it against
[`examples/example-seeded`](../example-seeded) running at the same time to see exactly what
`tokotuku db seed` adds.

## Deploy

Create the remote resources, replace the placeholder D1 ID in `wrangler.jsonc`, and add the secret
before the first deployment:

```sh
wrangler login
wrangler d1 create example-bare-db
wrangler r2 bucket create example-bare-media
wrangler secret put BETTER_AUTH_SECRET
bun run db:migrate:remote
bun run deploy
```
