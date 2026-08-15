# Tokotuku

An a-la-carte e-commerce framework built on Astro, Cloudflare (D1 + R2), and Better Auth. The goal
is a set of installable `@tokotuku/*` packages — storefront, admin, and migrations shipped
together per feature — so a client project stays a handful of config and theme files instead of a
forked copy of the whole app.

## Workspace layout

```
apps/
  docs/             Documentation site (Astro + Starlight)
  storybook/        Isolated Astro component development and accessibility checks
examples/
  example-bare/     Example: fresh `create-tokotuku` install, no data, port 4410
  example-seeded/   Example: bare install + `tokotuku db seed`, port 4420
  example-styled/   Example: seeded install + a theme override, port 4430
packages/
  core/             Integration, registry, middleware, admin shell (@tokotuku/core)
  auth/             Better Auth + roles (@tokotuku/auth)
  ui/               The complete Astro component set (@tokotuku/ui)
  catalog/          Product catalog + admin + demo seed (@tokotuku/catalog)
  orders/           Orders lifecycle + checkout + cart (@tokotuku/orders)
  create-tokotuku/  `bunx create-tokotuku` scaffolding CLI
configs/            Shared TypeScript, tsup, and vitest configuration (@tokotuku/config)
scripts/            Repo maintenance scripts (e.g. commit message validation)
tools/              Local dev infrastructure (Verdaccio private registry, e2e install gates)
```

Every `@tokotuku/*` package is consumed by the `apps/*` and `examples/*` clients as a local
workspace package (`workspace:*`) — nothing here needs Verdaccio or a real npm publish to install
and run.

## Examples

Three small client apps under `examples/` exist purely to demonstrate the framework's three core
claims, each independently runnable (distinct dev ports, so all three can run at once):

| App | Demonstrates | Dev port |
| --- | --- | --- |
| [`examples/example-bare`](examples/example-bare) | What `bunx create-tokotuku` produces on its own — no demo data | 4410 |
| [`examples/example-seeded`](examples/example-seeded) | The same bare install, after running `bun run db:seed` | 4420 |
| [`examples/example-styled`](examples/example-styled) | Overriding a stock `@tokotuku/ui` component from client code (`src/theme/`) | 4430 |

Each app's own README has exact setup commands. `example-bare` and `example-seeded` start from
identical source — the only difference is the runtime action of running the seed command, so diff
them if you want to confirm that directly. `example-styled` adds one file,
[`src/theme/ProductCard.astro`](examples/example-styled/src/theme/ProductCard.astro), which
replaces `@tokotuku/ui`'s stock product card everywhere it's used — nothing else in the app
changes.

## Requirements

- [Bun](https://bun.sh) >= 1.3.0
- [Node.js](https://nodejs.org) 20.16+, 22.19+, or 24+ for Storybook 10
- [Moon](https://moonrepo.dev) (task runner / task graph across the workspace)
- git (Moon needs at least one commit — `HEAD` must resolve — before any `moon run`/`moon check` command will work)

## Getting started

```sh
bun install
bun run build
bun run lint
bun run typecheck
```

## Conventions

- npm scope: `@tokotuku/*`
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/); enforced by a Lefthook `commit-msg` hook
