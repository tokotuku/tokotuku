# Tokotuku

An a-la-carte e-commerce framework built on Astro, Cloudflare (D1 + R2), and Better Auth. The goal
is a set of installable `@tokotuku/*` packages — storefront, admin, and migrations shipped
together per feature — so a client project stays a handful of config and theme files instead of a
forked copy of the whole app.

## Workspace layout

```
apps/
  docs/        Documentation site (Astro + Starlight)
  example/     Reference client app — proves the framework end to end
  storybook/   Isolated Astro component development and accessibility checks
packages/
  ui/          The complete Astro component set (@tokotuku/ui)
configs/       Shared TypeScript, tsup, and vitest configuration (@tokotuku/config)
scripts/       Repo maintenance scripts (e.g. commit message validation)
tools/         Local dev infrastructure (Verdaccio private registry)
```

`packages/ui` and `apps/example` are consumed as local workspace packages today — component
development cannot drift from what `apps/example` runs. As feature modules (`@tokotuku/catalog`,
`@tokotuku/orders`, `@tokotuku/auth`, …) are extracted from `apps/example` into `packages/*`, this
repository becomes the source for a `create-tokotuku` scaffolding CLI. There is no scaffolding CLI
yet — `apps/example` is still the one reference app the extraction work is being verified against.

Run the reference app:

```sh
bun run example
```

Then open `http://localhost:4400`.

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
