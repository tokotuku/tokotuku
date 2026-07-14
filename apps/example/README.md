# Astro Starter Kit: Minimal

```sh
bun create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `bun install`             | Installs dependencies                            |
| `bun dev`             | Starts local dev server at `localhost:4321`      |
| `bun build`           | Build your production site to `./dist/`          |
| `bun preview`         | Preview your build locally, before deploying     |
| `bun astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `bun astro -- --help` | Get help using the Astro CLI                     |

## ☁️ Cloudflare (D1 + R2) local setup

This app runs on Cloudflare Workers (D1 for the `products` table, R2 for product images).
Local development is fully offline — no Cloudflare account or `wrangler login` required.

Run these once, from `apps/example`, in order:

```sh
bun install                # installs @astrojs/cloudflare + wrangler
bun run cf-typegen         # generates worker-configuration.d.ts from wrangler.jsonc
bun run db:migrate:local   # applies migrations/0000_create_products_table.sql to local D1
bun run db:seed:local      # inserts sample rows from seed/seed.sql
bun run r2:seed:local      # uploads seed/images/*.svg into local R2
bun run dev                # astro dev on http://localhost:4321
```

All local state lives in `.wrangler/state/` (gitignored) and is shared between the `wrangler`
CLI commands above and `astro dev` (via the Cloudflare adapter's `platformProxy`). Delete
`.wrangler/` to reset local D1/R2 state and re-run the commands above.

To preview the actual built Worker (closer to production than `astro dev`):

```sh
bun run build
bun run preview            # wrangler dev against dist/_worker.js
```

### Deploying for real

The following require your own Cloudflare account and are **not** run automatically —
run them yourself:

```sh
wrangler login
wrangler d1 create tokotuku-example-products
# copy the returned database_id into wrangler.jsonc -> d1_databases[0].database_id
bun run db:migrate:remote
bun run db:seed:remote          # optional
wrangler r2 bucket create tokotuku-example-images
wrangler r2 object put tokotuku-example-images/products/widget.svg --remote --file=./seed/images/widget.svg --content-type=image/svg+xml
wrangler r2 object put tokotuku-example-images/products/gadget.svg --remote --file=./seed/images/gadget.svg --content-type=image/svg+xml
wrangler r2 object put tokotuku-example-images/products/gizmo.svg  --remote --file=./seed/images/gizmo.svg  --content-type=image/svg+xml
bun run deploy                  # astro build && wrangler deploy
```

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
