# example-styled

**What this proves:** a client can override a stock `@takontuku/ui` component from its own source
tree, without forking the package. This app starts from the same bare scaffold as
[`examples/example-bare`](../example-bare) and [`examples/example-seeded`](../example-seeded), plus
exactly one added file:
[`src/theme/ProductCard.astro`](src/theme/ProductCard.astro). This is one of three example apps
under the repo root's `examples/` directory — see the
[root README's Examples section](../../README.md#examples) for how the three relate.

## How the override works

`@takontuku/core`'s Astro integration scans `<root>/src/theme/*.astro` once at
`astro:config:setup`. Any file there whose name matches a component `@takontuku/ui` exports (here,
`ProductCard.astro`) becomes a Vite `resolve.alias` redirect: every import of
`@takontuku/ui/ProductCard.astro`, from any package, transparently resolves to this file instead.
No fork of `@takontuku/ui`, no changes anywhere else in this app — `packages/catalog`'s product
listing page imports `ProductCard` exactly the way it always does and has no idea it's been
overridden. See [`packages/core/src/theme-alias.ts`](../../packages/core/src/theme-alias.ts) for
the mechanism itself.

The override is scanned at build/config time, so it needs a rebuild (`astro build`) to take effect
when previewing through a static `wrangler dev` build. Running `astro dev` instead hot-reloads it.

Run Cloudflare resource commands (`wrangler`, `db:*`) from this directory. Run it through Moon from
the repository root with `bun run example-styled` (dev server on port 4430, distinct from
`example-bare` on 4410 and `example-seeded` on 4420 — all three can run at the same time).

## Local setup

Create `.dev.vars` with a local Better Auth secret:

```sh
openssl rand -base64 32
```

```dotenv
BETTER_AUTH_SECRET=<generated-value>
```

Then initialize the local Cloudflare resources and seed (seeding is optional for `example-bare`
and `example-seeded`, but here it's what gives you products to actually see the new card design
on):

```sh
bun run cf-typegen
bun run db:migrate:local
bun run db:seed
```

From the repository root:

```sh
bun run example-styled
```

Open `http://localhost:4430/setup` and create the first administrator, same as the other two
example apps. Then open `/products`: the same six seeded products render, but through this app's
own card design instead of `@takontuku/ui`'s stock `.product-card` — confirm by comparing against
`example-seeded` running at the same time on port 4420, or by inspecting the rendered class names
directly (`curl -s localhost:4430/products | grep -o 'product-card'` should print nothing here,
while the same command against `example-seeded` on port 4420 does).

To try your own design: edit `src/theme/ProductCard.astro` directly, or copy the pattern to
override a different `@takontuku/ui` component by matching its filename under `src/theme/`.

## Deploy

Create the remote resources, replace the placeholder D1 ID in `wrangler.jsonc`, and add the secret
before the first deployment:

```sh
wrangler login
wrangler d1 create example-styled-db
wrangler r2 bucket create example-styled-media
wrangler secret put BETTER_AUTH_SECRET
bun run db:migrate:remote
bun run deploy
```
