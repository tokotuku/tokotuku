# Karsa

Karsa is a site-neutral, Astro-first foundation for accessible interfaces, editorial content,
and modular applications. It combines typed `@karsa/*` packages, semantic `--karsa-*` theme
tokens, optional modules, and a CLI that keeps configuration, middleware, migrations, and the
resolved registry in agreement.

## Workspace layout

```text
apps/
  docs/             Bilingual Astro + Starlight documentation (`/en/`, `/id/`)
  storybook/        Isolated component development and accessibility checks
examples/           Preset/tier fixture matrix; treat as generated acceptance fixtures
packages/
  core/             Integration, registry, middleware, CLI, and Karsa skills
  auth/             Registration, sessions, and access control
  jarene/           Optional server-rendered auth-panel contribution
  theme/            Tokens, palettes, fonts, and theme bootstrap
  ui/               Astro component primitives and site surfaces
  charts/           Optional chart component and types
  catalog/          Product-domain module (private registry)
  orders/           Order-domain module (private registry)
  booking/          Scheduling-domain module (private registry)
  content/          Publication/blog content module (private registry)
  create-karsa/     `bunx create-karsa` scaffolding CLI
configs/             Shared TypeScript, tsup, and vitest configuration
tools/               Fixture evaluation, local registry, and end-to-end gates
```

Each `@karsa/*` package is consumed by workspace apps and fixtures. Public package exports are
the source of truth; do not copy package routes into an application page. Read the [bilingual
documentation](apps/docs/README.md) for the full preset, module, content, theme, auth, AI, and
deployment contracts.

## Requirements

- [Bun](https://bun.sh) >= 1.3.0
- [Node.js](https://nodejs.org) 20.16+, 22.19+, or 24+ for Storybook 10
- git

Workspace gates use Bun directly, so lint, typecheck, test, build, and local-registry rehearsals
also work in offline environments without downloading a task-runner toolchain plugin.

## Development

```sh
bun install
bun run build
bun run lint
bun run typecheck
```

For docs-specific work:

```sh
bun run --cwd apps/docs parity
bun run --cwd apps/docs typecheck
bun run --cwd apps/docs build
```

The docs parity check requires every `/en/` page to have an `/id/` pair at the same relative
path, and vice versa.

## Modules and data

Use the CLI to change the module graph:

```sh
bunx karsa add <module>
bunx karsa remove <module>
bunx karsa db sync
bunx karsa db seed
```

The add/remove command updates the package dependency, `astro.config.mjs`, and any middleware
registration together. `db sync` collects module migrations into append-only `migrations/` and
`karsa.migrations.json`; review the diff before applying local or remote migrations. `db seed` is
local-only and loads idempotent starting data and allowed media keys.

Cloudflare runtime bindings are `DB` (D1) and `MEDIA` (R2). Keep local secrets in gitignored
`.dev.vars` and deployed secrets in Wrangler. Format dates and money with Karsa's locale-aware
helpers rather than in a component.

## AI-first client scaffolds

`bunx create-karsa` generates `AGENTS.md` as the canonical project guide, a short `CLAUDE.md`
bridge, and a README with starter prompts. `bunx karsa skills install` puts the five Karsa skills
into `.agents/skills/` and `.claude/skills/` for Codex, Claude, and Cursor. The source of truth is
`packages/core/skills/`; refresh both target directories after upgrading `@karsa/core`.

Indonesian starter prompt:

```text
Baca AGENTS.md. Pilih preset dan tier yang diizinkan, jelaskan asumsi serta kepemilikan halaman,
periksa config, registry, pages, seed, dan ownership, lalu implementasikan irisan vertikal terkecil.
Jalankan typecheck, lint, dan build yang relevan. Laporkan bukti serta temuan over-engineering dan
under-engineering.
```

English starter prompt:

```text
Read AGENTS.md. Choose the authorized preset and tier, explain assumptions and page ownership,
check config, registry, pages, seed, and ownership, then implement the smallest vertical slice.
Run the relevant typecheck, lint, and build. Report evidence plus over-engineering and
under-engineering findings.
```

## Conventions

- npm scope: `@karsa/*`
- CLI: `karsa` and `create-karsa`
- Theme tokens: semantic `--karsa-*`
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) and are checked by Lefthook
- Do not edit generated fixture output or `examples/**` during normal package/docs work
- The [0.2 → 0.3 migration guide](apps/docs/src/content/docs/en/migration/0-2-to-0-3.mdx) is the explicit historical allowlist for legacy identifiers and manifest renaming

Never rebase `dev` after it has been merged into `main`; pull `main` back into `dev` with a merge
commit so shared commits retain their identity.
