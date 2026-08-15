# example-seeded

**What this proves:** what `tokotuku db seed` does to a bare install. This app's source is
**identical** to [`apps/example-bare`](../example-bare) — diff the two `src/` directories yourself
to confirm there is no hidden file. The only difference is a runtime action taken after setup: one
extra command. This is one of three example apps under the repo root's `apps/` directory — see the
[root README's Examples section](../../README.md#examples) for how the three relate.

Run Cloudflare resource commands (`wrangler`, `db:*`) from this directory. Run it through Moon from
the repository root with `bun run example-seeded` (dev server on port 4420, distinct from
`example-bare` on 4410 and `example-styled` on 4430 — all three can run at the same time).

## Local setup

Create `.dev.vars` with a local Better Auth secret:

```sh
openssl rand -base64 32
```

```dotenv
BETTER_AUTH_SECRET=<generated-value>
```

Then initialize the local Cloudflare resources and seed:

```sh
bun run cf-typegen
bun run db:migrate:local
bun run db:seed
```

`db:seed` is the one extra step versus `example-bare`. It runs every installed module's own seed —
here, `@tokotuku/catalog`'s six premium demo products (Cangkir Stoneware, Tas Linen, Lampu Meja
Arc, Jurnal Linen, Nampan Walnut, and Karaf Kaca) with stock rows and optimized WebP product
images — then uploads the images to the local R2 bucket. It creates no orders or sales metrics. It is local-only by design: there is no
`--remote` path, so demo data can never land in a live database by accident.

From the repository root:

```sh
bun run example-seeded
```

Open `http://localhost:4420/setup` and create the first administrator, same as `example-bare`.
Then open `/products`: six products render, and `/api/images/products/cangkir-stoneware.webp`
(etc.) serves the seeded images. Re-running `bun run db:seed` is safe — it is idempotent and
preserves customized legacy rows, so it will not duplicate the catalog.

## Deploy

Create the remote resources, replace the placeholder D1 ID in `wrangler.jsonc`, and add the secret
before the first deployment:

```sh
wrangler login
wrangler d1 create example-seeded-db
wrangler r2 bucket create example-seeded-media
wrangler secret put BETTER_AUTH_SECRET
bun run db:migrate:remote
bun run deploy
```

There is no `db:seed` equivalent for `--remote` — populate a live store through the admin panel
itself, not by replaying local demo data onto it.
