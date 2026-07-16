# Tokotuku UI

An Astro-first component system built with semantic HTML, Tailwind CSS v4, Alpine.js, and strict TypeScript.

## Workspace layout

```
apps/
  docs/        Documentation site (Astro + Starlight)
  example/     Runs the complete e-commerce starter from template/
configs/       Shared strict TypeScript configuration
scripts/       Repo maintenance scripts (e.g. commit message validation)
template/      Standalone Bun + Moon starter source, including UI and Storybook
```

The Astro UI and Tailwind theme live in one package inside `template/packages`, making the generated starter
self-contained. Root docs and the example app consume those exact local packages, so component
development cannot drift from what the starter repository receives.

## Starter template

`template/` is the source of the opinionated Tokotuku starter:

- Bun workspaces orchestrated by Moonrepo
- Astro on Cloudflare Workers
- D1 and R2 bindings
- Better Auth with login and registration flows
- `packages/ui` for the complete Astro component set
- `apps/storybook` for isolated Astro component development and accessibility checks

Astro's GitHub template argument accepts a repository and optional branch, but not a nested
directory. The `sync-starter.yml` workflow publishes the contents of `template/` to the root of
the `tokotuku/starter-template` repository whenever template changes land on `main`. Install it
with:

```sh
bun create astro@latest my-app --template tokotuku/starter-template
```

`template/` in this repository is the source of truth; the generated starter repository should
not be edited directly. To enable synchronization, initialize `starter-template` with a `main`
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
