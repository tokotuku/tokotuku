# Tokotuku UI

A framework-agnostic Web Components design system with first-class Astro support, built on Lit and strict TypeScript.

## Workspace layout

```
apps/
  docs/        Documentation site (Astro + Starlight)
  example/     Runs the complete e-commerce starter from template/
packages/
  core/        Framework-agnostic utilities/controllers — zero UI
  elements/    Web Components (tk-* custom elements, Lit + Shadow DOM)
  tokens/      Design tokens (spacing, typography, color, radius, shadows, durations, z-index, breakpoints)
  theme/       Light/dark/high-contrast themes built from tokens (CSS variables only)
  icons/       Tree-shakeable SVG icon set
  astro/       Astro wrappers around @tokotuku/elements — no duplicated logic
  testing/     Shared Vitest/Playwright/accessibility test helpers
configs/       Shared tsconfig, tsup, and vitest base configs
scripts/       Repo maintenance scripts (e.g. commit message validation)
template/      Standalone Bun + Moon starter source (Astro, Cloudflare, Better Auth, app UI)
```

The root workspace develops and publishes the `@tokotuku/*` primitive packages. The
`template/` directory is intentionally a separate workspace: generated applications consume
released `@tokotuku/*` packages and keep product-specific composition in `packages/ui`.

## Starter template

`template/` is the source of the opinionated Tokotuku starter:

- Bun workspaces orchestrated by Moonrepo
- Astro on Cloudflare Workers
- D1 and R2 bindings
- Better Auth with login and registration flows
- `packages/ui` for application-specific components composed from `@tokotuku/elements`

Astro's GitHub template argument accepts a repository and optional branch, but not a nested
directory. The `sync-starter.yml` workflow publishes the contents of `template/` to the root of
the `<owner>/tokotuku-starter` repository whenever template changes land on `master`. Install it
with:

```sh
bun create astro@latest my-app --template <owner>/tokotuku-starter
```

`template/` in this repository is the source of truth; the generated starter repository should
not be edited directly. To enable synchronization, initialize `tokotuku-starter` with a `main`
branch and add a `STARTER_REPO_TOKEN` Actions secret to this repository. The token must have
read/write Contents access to the starter repository.

The root example project is the development entry point for that exact template—there is no
separate application implementation that can drift from the generated starter:

```sh
bun run example
```

Then open `http://localhost:4400`.

## Requirements

- [Bun](https://bun.sh) >= 1.3.0
- [Moon](https://moonrepo.dev) (task runner / task graph across the workspace)
- git (Moon needs at least one commit — `HEAD` must resolve — before any `moon run`/`moon check` command will work)

## TypeScript version

Pinned to **5.9.3**, not the `latest` dist-tag (7.0.2, the native/Go compiler). `tsup`'s `.d.ts` bundler (`rollup-plugin-dts`) crashes against TypeScript 7 today (`Cannot read properties of undefined (reading 'useCaseSensitiveFileNames')`). Revisit once that toolchain catches up.

## Getting started

```sh
bun install
bun run build
bun run test
bun run lint
bun run typecheck
```

## Conventions

- Custom element tag prefix: `tk-` (e.g. `<tk-button>`)
- Custom event names: `tk-<name>` (e.g. `tk-change`, `tk-open`)
- npm scope: `@tokotuku/*`
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/); enforced by a Lefthook `commit-msg` hook
- Versioning via [Changesets](https://github.com/changesets/changesets)
