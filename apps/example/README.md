# Tokotuku example

Development entry point for the complete e-commerce starter in `template/`.

This project runs the application source from `template/apps/web` and installs
`template/packages/ui` as a local file dependency. Published primitives resolve from the root
workspace during development. The example therefore exercises the same Cloudflare Workers,
D1, R2, Better Auth, application UI, and Flint/ECharts integration that generated projects
receive without waiting for `@tokotuku/*` to be published.

## Run

From the repository root:

```sh
bun run example
```

Open `http://localhost:4400`, register a local account, and use the seeded store dashboard.
The root route is a public storefront. Use `/admin` for the authenticated dashboard; the
example shares the template's local D1 and R2 persistence so both surfaces see the same data.

Initialize the local Cloudflare resources once if needed:

```sh
cd template/apps/web
bun run cf-typegen
bun run db:migrate:local
bun run db:seed:local
bun run r2:seed:local
```

`template/` remains a separate Bun + Moon workspace and the source of truth. This directory
contains configuration only; do not copy the template application source into it.
