# Tokotuku starter web app

The application layer of the Tokotuku starter: Astro on Cloudflare Workers with D1, R2,
Better Auth, and product UI composed through `@tokotuku-starter/ui`.

Run workspace commands from the template root. Run Cloudflare resource commands from this
directory.

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
bun run db:seed:local
bun run r2:seed:local
```

From the template root, start the app through Moon:

```sh
bun run dev
```

The products page redirects to `/login` until a user registers or signs in. Local D1 and R2
state lives under `.wrangler/state/`.

## Deploy

Create the remote resources, replace the placeholder D1 ID in `wrangler.jsonc`, and add the
secret before the first deployment:

```sh
wrangler login
wrangler d1 create tokotuku-starter-products
wrangler r2 bucket create tokotuku-starter-images
wrangler secret put BETTER_AUTH_SECRET
bun run db:migrate:remote
bun run db:seed:remote
bun run deploy
```

The Better Auth base URL is intentionally derived from each request's origin. Do not replace it
with a fixed development URL.
