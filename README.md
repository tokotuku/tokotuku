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
  compro-*/         Company-profile AI fixture matrix
  product-*/        Product-commerce AI fixture matrix
  service-*/        Service-commerce AI fixture matrix
packages/
  core/             Integration, registry, middleware, admin shell (@takontuku/core, public)
  auth/             Better Auth + roles (@takontuku/auth, public)
  jarene/           Server-rendered auth-panel quote module (@takontuku/jarene, public)
  ui/               The complete Astro component set (@takontuku/ui, public)
  catalog/          Product catalog + admin + demo seed (@takontuku/catalog, private)
  orders/           Orders lifecycle + checkout + cart (@takontuku/orders, private)
  booking/          Service scheduling and booking (@takontuku/booking, private)
  create-takontuku/  `bunx create-takontuku` scaffolding CLI
configs/            Shared TypeScript, tsup, and vitest configuration (@takontuku/config)
scripts/            Repo maintenance scripts (e.g. commit message validation)
tools/              Local dev infrastructure (Verdaccio private registry, e2e install gates)
```

Every `@takontuku/*` package is consumed by the `apps/*` and `examples/*` fixtures as a local
workspace package (`workspace:*`) — nothing here needs Verdaccio or a real npm publish to install
and run.

## AI fixture matrix

The `examples/` directory is a nine-case acceptance matrix for the AI-first scaffold. Each
fixture is generated in a fresh Luna-medium session and reviewed by a separate Terra-high session.
The three rows within each business type deliberately share a brand so install-only, content, and
polished behavior can be compared directly. See [`examples/README.md`](examples/README.md) for
the prompts, module expectations, checks, scores, and review findings.

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

## AI-first client scaffolds

`bunx create-takontuku` generates `AGENTS.md` as the canonical project guide, a small
`CLAUDE.md` bridge, and a README with AI starter prompts. A normal install also runs
`takontuku skills install`, which puts the four Takontuku skills into `.agents/skills/` and
`.claude/skills/` for Codex, Cursor, and Claude. Run that command again after upgrading
`@takontuku/core`.

## Conventions

- npm scope: `@takontuku/*`
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/); enforced by a Lefthook `commit-msg` hook
- Never rebase `dev` after it has been merged into `main` -- pull `main` back into `dev` with a merge commit instead. Rebasing after the fact gives the same commits different SHAs on each branch, so a later `dev` → `main` merge sees every shared file as changed on both sides and conflicts everywhere even when the trees agree
