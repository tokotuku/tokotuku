# Takontuku

An a-la-carte e-commerce framework built on Astro, Cloudflare (D1 + R2), and Better Auth. The goal
is a set of installable `@takontuku/*` packages — storefront, admin, and migrations shipped
together per feature — so a client project stays a handful of config and theme files instead of a
forked copy of the whole app.

## Workspace layout

```
apps/
  docs/             Documentation site (Astro + Starlight)
  storybook/        Isolated Astro component development and accessibility checks
examples/
  example-bare/     Example: fresh `create-takontuku` install, no data, port 4410
  example-seeded/   Example: bare install + `takontuku db seed`, port 4420
  example-styled/   Example: seeded install + a theme override, port 4430
packages/
  core/             Integration, registry, middleware, admin shell (@takontuku/core, public)
  auth/             Better Auth + roles (@takontuku/auth, public)
  ui/               The complete Astro component set (@takontuku/ui, public)
  catalog/          Product catalog + admin + demo seed (@takontuku/catalog, private)
  orders/           Orders lifecycle + checkout + cart (@takontuku/orders, private)
  create-takontuku/  `bunx create-takontuku` scaffolding CLI
configs/            Shared TypeScript, tsup, and vitest configuration (@takontuku/config)
scripts/            Repo maintenance scripts (e.g. commit message validation)
tools/              Local dev infrastructure (Verdaccio private registry, e2e install gates)
```

Every `@takontuku/*` package is consumed by the `apps/*` and `examples/*` clients as a local
workspace package (`workspace:*`) — nothing here needs Verdaccio or a real npm publish to install
and run.

## Examples

Three small client apps under `examples/` exist purely to demonstrate the framework's three core
claims, each independently runnable (distinct dev ports, so all three can run at once):

| App | Demonstrates | Dev port |
| --- | --- | --- |
| [`examples/example-bare`](examples/example-bare) | What `bunx create-takontuku` produces on its own — public-only (`auth`+`core`+`ui`), no demo data | 4410 |
| [`examples/example-seeded`](examples/example-seeded) | `example-bare` plus `catalog`+`orders` added, then seeded with `bun run db:seed` | 4420 |
| [`examples/example-styled`](examples/example-styled) | Overriding a stock `@takontuku/ui` component from client code (`src/theme/`) | 4430 |

Each app's own README has exact setup commands. `example-styled` adds one file,
[`src/theme/ProductCard.astro`](examples/example-styled/src/theme/ProductCard.astro), which
replaces `@takontuku/ui`'s stock product card everywhere it's used — nothing else in the app
changes.

## Modules

A client changes which `@takontuku/*` modules it has installed with the `takontuku` CLI, which
ships on `@takontuku/core`:

```sh
bunx takontuku add orders      # installs the package, wires astro.config.mjs and
                                # src/middleware.ts, pulls in modules it requires, then
                                # runs `db sync`
bunx takontuku remove orders   # reverses the above -- refuses if another installed
                                # module still requires it, and never touches
                                # migrations/ or the lockfile
```

Both edit `astro.config.mjs` and `src/middleware.ts` in place rather than asking for a manual
edit; see [`packages/core/src/cli/astro-config.ts`](packages/core/src/cli/astro-config.ts) for how.

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

- npm scope: `@takontuku/*`
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/); enforced by a Lefthook `commit-msg` hook
- Never rebase `dev` after it has been merged into `main` -- pull `main` back into `dev` with a merge commit instead. Rebasing after the fact gives the same commits different SHAs on each branch, so a later `dev` → `main` merge sees every shared file as changed on both sides and conflicts everywhere even when the trees agree
