# Tokotuku example

The reference client app: Astro on Cloudflare Workers with D1, R2, Better Auth, and product UI
composed through `@tokotuku/ui`. This is the in-tree proof that the framework works end to end —
it currently runs as a single application ahead of the `@tokotuku/*` package extraction; once
that lands, this app's `src/` collapses down to config + theme, consuming the packages instead of
containing their source.

Run workspace commands (`bun run example`) from the repository root. Run Cloudflare resource
commands (`wrangler`, `db:*`, `r2:*`) from this directory.

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
bun run db:seed
```

From the repository root, start the app through Moon:

```sh
bun run example
```

Open `http://localhost:4400/setup` and create the first administrator. This is a one-time
bootstrap route: after the administrator is created it redirects to login permanently and cannot
be used to create another administrator.

New registrations receive the `customer` role. `bun run db:seed` adds the six premium catalog
products from `@tokotuku/catalog` (and no orders or sales), plus predefined local demo accounts
(this app's own `seed/demo-users.sql`, not something `@tokotuku/catalog` ships):

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@example.com` | `admin12345` |
| Staff | `staff@example.com` | `staff12345` |
| Customer | `customer@example.com` | `customer12345` |

Only admin and staff accounts can access `/admin`; customers can use the storefront and checkout.
`tokotuku db seed` is local-only by design — there is no remote seeding path, so these credentials
can never end up in a live database. Because the demo seed already contains an administrator,
`/setup` is disabled as expected. Local D1 and R2 state lives under `.wrangler/state/`.

## Deploy

Create the remote resources, replace the placeholder D1 ID in `wrangler.jsonc`, and add the
secret before the first deployment:

```sh
wrangler login
wrangler d1 create tokotuku-starter-products
wrangler r2 bucket create tokotuku-starter-images
wrangler secret put BETTER_AUTH_SECRET
bun run db:migrate:remote
bun run deploy
```

There is no `db:seed:remote` — populate a live store through the admin panel itself, not by
replaying local demo data onto it.

The Better Auth base URL is intentionally derived from each request's origin. Do not replace it
with a fixed development URL.
