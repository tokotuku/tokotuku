# Tokotuku UI

A framework-agnostic Web Components design system with first-class Astro support, built on Lit and strict TypeScript.

## Workspace layout

```
apps/
  docs/        Documentation site (Astro + Starlight)
  playground/  Manual testing ground for components (Vite)
  example/     Standalone Astro starter (unrelated to the design system)
packages/
  core/        Framework-agnostic utilities/controllers — zero UI
  elements/    Web Components (tk-* custom elements, Lit + Shadow DOM)
  tokens/      Design tokens (spacing, typography, color, radius, shadows, durations, z-index, breakpoints)
  theme/       Light/dark/high-contrast themes built from tokens (CSS variables only)
  icons/       Tree-shakeable SVG icon set
  astro/       Astro wrappers around @tokotuku/elements — no duplicated logic
  cli/         Developer CLI (create component, generate icon/docs/playground/changelog)
  testing/     Shared Vitest/Playwright/accessibility test helpers
configs/       Shared tsconfig, tsup, and vitest base configs
scripts/       Repo maintenance scripts (e.g. commit message validation)
```

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
