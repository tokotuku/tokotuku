---
name: takontuku-modules
description: Install, remove, and detect Takontuku feature modules (catalog, orders, booking, auth, and jarene) in a Takontuku store. Use when choosing app modules, adding or dropping a feature, when a module's routes or admin nav are missing, when editing astro.config.mjs or src/middleware.ts, or when writing code that must work whether or not a module is installed.
license: MIT
metadata:
  package: "@takontuku/core"
---

# Takontuku modules

A Takontuku store is assembled from modules. `auth` and the optional `jarene` auth-panel
quote module ship in every scaffold; `catalog` and `orders` are added on demand. Each
module contributes only the surfaces it owns — routes, admin nav entries, migrations,
seeds, or auth-panel widgets — so installing one is never just adding a dependency.

## Never wire a module by hand

The dependency and `astro.config.mjs` (the `modules:` array) must stay in agreement;
`src/middleware.ts` also changes when a module exposes a `/register` entrypoint. The CLI
owns all of these. Editing them yourself is the most common way to end up with a
half-installed module — dependency present, routes missing, or a build that fails on an
unresolved import.

```bash
bunx takontuku add jarene
bunx takontuku remove orders
```

Useful flags: `--no-install` (edit config only, skip the package manager) and
`--no-sync` (skip the migration collection step).

## Dependencies between modules

`orders` requires `catalog`. `booking` requires both `orders` and `catalog`. Adding either
module pulls its requirements in automatically. Removing
`catalog` while `orders` is installed is refused rather than silently breaking the
store — remove `orders` first.

## Finish the install

Adding a module usually brings migrations with it. They are not applied by the add step:

```bash
bunx takontuku db sync                          # collect module migrations into migrations/
bunx wrangler d1 migrations apply DB --local    # apply them locally
```

See the `takontuku-data` skill for what these do and why the order matters.

For the three common app shapes, use this mapping:

- Company profile: keep the scaffold modules; do not add catalog, orders, or booking merely to
  obtain a marketing page.
- Product commerce: add `orders`; the CLI adds `catalog` as a dependency.
- Service commerce: add `booking`; the CLI adds `orders` and `catalog` as dependencies.

## Modules that need registry access

`@takontuku/catalog` and `@takontuku/orders` are commercial and are not on public npm.
Installing them needs an `.npmrc` mapping the `@takontuku` scope to the registry that
hosts them, plus credentials for it. If `takontuku add catalog` fails to resolve the
package, that is the cause — not a broken CLI.

## Writing code that survives either state

Never assume a module is present. The resolved registry is a virtual module that core
always provides:

```ts
import registry from "virtual:takontuku/registry";

const hasCatalog = registry.moduleNames.includes("catalog");
```

Use it to gate anything module-specific — a nav link, a `Sitemap:` line, a cart
affordance. A page that statically imports from `@takontuku/catalog` will fail to build
in a store that does not have it, and a dynamic `import()` inside an `if` does not help:
Vite still resolves the specifier at build time. If a route only makes sense with a
module installed, that route belongs to the module, contributed through its own
`storefrontRoutes`, not in the store's `src/pages/`.

Other virtual modules on the same contract: `virtual:takontuku/config` (brand),
`virtual:takontuku/admin-nav`, `virtual:takontuku/storefront-home-sections`,
`virtual:takontuku/admin-dashboard-widgets`, and
`virtual:takontuku/auth-panel-widgets`.
