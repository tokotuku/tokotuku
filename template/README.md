# Tokotuku starter

An opinionated Bun and Moonrepo monorepo for building an Astro application on Cloudflare
Workers. Cloudflare D1, R2, Better Auth, and Tokotuku UI primitives are included by default.

## Workspace

```text
apps/
  web/       Astro + Cloudflare application and Better Auth routes
packages/
  ui/        Product UI and charts composed from versioned @tokotuku primitives
```

`@tokotuku/elements` owns accessible primitives. Keep business meaning and application variants
inside `packages/ui`; prefer slots, CSS custom properties, parts, and composition over extending
primitive classes.

The starter UI includes its dashboard shell, navigation, feedback states, data display,
tables, and statistics. Charts use Flint Chart as the declarative compiler and a modular
ECharts 6 SVG runtime. See `packages/ui/README.md` for the inventory and chart API.

## Start

```sh
bun install
cd apps/web
bun run cf-typegen
bun run db:migrate:local
bun run db:seed:local
bun run r2:seed:local
cd ../..
bun run dev
```

See `apps/web/README.md` for secrets and deployment setup.

## Commands

```sh
bun run dev
bun run build
bun run lint
bun run typecheck
```

All root commands delegate to Moon. Each app and package owns its task inputs and outputs in a
local `moon.yml`.
