# Gates 1-3 + update propagation + demo: tarball install through `bun update`

Six scripts, sharing `shared.ts` for the publish/scaffold/assert mechanics.

## Gate 1 — `run.ts`, "tarball install"

Publishes every publishable `@takontuku/*` package to a real registry and installs them into a
scratch client the way a real client would — `create-takontuku` → `bun install` → `takontuku db
sync` → `wrangler d1 migrations apply --local` → `astro build` → a `wrangler dev` boot check.

This exists because `workspace:*` symlinks hide problems that only surface once packages are
actually installed from tarballs: broken `exports` maps, missing `files` entries, missing
`peerDependencies`, and `node_modules` module resolution failures. Every package in this repo can
pass `moon ci :lint :typecheck :test :build` and still be broken for a real client — this is the
gate that catches that class of bug.

## Gate 2 — `fixtures.ts`, "a-la-carte nyata"

Gate 1 only proves the "everything installed" case works. Gate 2 proves the actual a-la-carte
seam: it scaffolds a client, then drops the `orders` module the same way a real client's
`astro.config.mjs` comment tells them to, and asserts the module's absence leaves zero trace —
no `orders`/`order_items`/`payments_bank_transfer_proofs` tables, no Orders entry in the admin
nav, no cart affordances on storefront pages — while `catalog` and `auth` keep working on their
own. A green Gate 1 proves nothing about this; only a test that asserts an optional module's
_absence_ proves the seam is real.

This is the version of the plan's Gate 2 achievable with today's module set: the original
describes fixtures spanning `content`, `projects`, `inquiry`, `inventory`, `shipping`, and
`payments-bank-transfer`, none of which exist as separate packages yet.

## Gate 2b — `upgrade.ts`, "nambah modul belakangan"

Gates 1 and 2 both start fresh every run, so neither can catch a migration-numbering regression —
that only shows up when a module is added to a client that's already been migrated and has real
data. This is the scenario that actually happens to a real client: they start with a subset of
modules, run for a while, then add one.

Builds a client with `{auth, catalog}`, migrates it, inserts a real product row, then adds
`orders` back and re-syncs. Asserts every already-applied migration file is byte-for-byte
unchanged (no rewrite, no renumbering), the new migrations get sequence numbers strictly higher
than everything already applied, and the pre-existing product survived. A purely topological
numbering scheme would break exactly here — a module whose topo position falls between two
already-installed modules would need a number smaller than migrations already applied, and
wrangler sorts by filename.

## Gate 3 — `smoke.ts`, "runtime smoke"

Gates 1/2/2b all prove the package graph installs and migrates correctly; none of them click
through the application. Gate 3 is the golden path a real customer and admin actually walk:
setup → login → storefront lists a seeded product → checkout creates an order → the order row
lands in D1 → admin sees it in `/admin/orders` → a status transition (`pending` → `confirmed`)
sticks.

The plan's original Gate 3 also includes "submit inquiry" — there's no `inquiry` package yet, so
that step is skipped.

## Gate 5 (verification slice) — `propagation.ts`, "update propagation"

The actual business reason this migration exists: "framework harus jadi package supaya perbaikan
bisa didorong lewat `bun update`." Scaffolds a client the way `create-takontuku` actually leaves
one — `@takontuku/*` dependencies pinned to the literal `"latest"` specifier, not a fixed version
— confirms a baseline, patches a string in `catalog`'s product listing, republishes, and asserts
`bun update` **in that same client directory** (not a fresh install) picks up the change.

This is a verification slice, not the plan's full Gate 5. The rest of Gate 5 calls for wiring
`changeset version` + publish into CI — Verdaccio on `dev`, real npm on `main`. That means
claiming the `@takontuku` scope on the public npm registry and putting publish credentials in CI:
a release-engineering decision with real external consequences, not something to set up
unilaterally. This script only proves the update *mechanism* itself works, entirely against the
local registry.

## Demo walkthrough — `demo.ts`, "bare install, seed, change the design"

The concrete client experience none of the other gates exercise: `create-takontuku` on its own,
then `takontuku db seed`, then a theme override — in that order, on the same client, asserting
each step's effect before moving to the next.

1. **Bare install.** A fresh scaffold's storefront shows the empty-catalog state — zero products,
   by design.
2. **Seed.** `takontuku db seed` inserts `@takontuku/catalog`'s 3 demo products (+ stock), uploads
   their images to R2, the storefront lists them, and the seeded image serves `200` with the
   right content type.
3. **Change the design.** Writing `src/theme/ProductCard.astro` and rebuilding replaces the stock
   product card with the override — proven by asserting the override's markup is present *and*
   the stock component's markup (`data-add-to-cart`) is gone, not just that the build succeeded.

This script exists because, before it did, neither of these two mechanisms had ever run for real.
Seeding had no framework mechanism at all — only a manual, hardcoded script in `apps/example`.
The theme override had a real bug: `buildThemeAliases`' `find` regex only anchored the end of the
specifier, so Vite's `id.replace(find, replacement)` left the original package prefix stuck onto
the front of the replacement path. The existing unit test only asserted `find.test(id)`, never
the actual `.replace()` output, so it passed while the feature was silently broken. See
`packages/core/src/theme-alias.ts` and `packages/core/src/theme-alias.test.ts`.

## Running locally

Start a local registry first:

```sh
moon run verdaccio:up
```

Then:

```sh
moon run e2e-install:run           # Gate 1
moon run e2e-install:fixtures      # Gate 2
moon run e2e-install:upgrade       # Gate 2b
moon run e2e-install:smoke         # Gate 3
moon run e2e-install:propagation   # Gate 5 (verification slice)
moon run e2e-install:demo          # Demo walkthrough
```

Each run publishes at a unique version (`0.0.0-e2e.<timestamp>`), so all six are safe to run
repeatedly against a registry that already has earlier runs' packages — reusing a version across
runs would either be rejected by the registry or, worse, serve a stale tarball from a package
manager's local cache even after a fresh publish.

Scratch clients are created under the OS temp directory and left in place after a successful run
for inspection; nothing is written inside this repo.

The helper writes the configured registry into each scratch client's `.npmrc` and passes it
explicitly to `bun install`/`bun update`. It also uses Bun's `--force` flag because every gate
publishes a fresh version and Bun otherwise may reuse a cached package manifest from the previous
gate, reporting that new version as missing.

## CI

All six run as one job (`.github/workflows/ci.yml`) with Verdaccio as a service container,
separate from the fast `lint`/`typecheck`/`test`/`build` sweep — that sweep has no registry
available, so these tasks are invoked explicitly rather than joining it.
