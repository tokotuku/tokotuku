---
name: takontuku-store-builder
description: Build or substantially customize a Takontuku storefront from a business brief, including company-profile, product-commerce, and service-booking modes. Use when choosing modules, shaping brand configuration, planning store pages, adding seed data, or validating a complete store workflow; do not use for a single isolated component or generic Astro work.
license: MIT
metadata:
  package: "@takontuku/core"
---

# Takontuku store builder

Turn a business brief into a cohesive Takontuku store while preserving the framework's
module ownership and configuration boundaries.

## Before implementation

1. Read the project's `AGENTS.md`, `astro.config.mjs`, `package.json`, and the resolved module
   registry. Check existing pages, theme overrides, and `seed/` before proposing new files.
2. Convert the brief into a short checklist: brand identity, storefront surfaces, admin
   surfaces, required modules, data needed to demonstrate the flow, and acceptance checks.
3. State assumptions that affect the result, especially missing catalog/order requirements,
   locale, currency, image sources, and whether the requested content is real seed data or demo
   data.
4. Load the focused Takontuku skills that apply: `takontuku-ui` for components and styling,
   `takontuku-modules` for feature ownership and optional-module behavior, and `takontuku-data`
   for migrations, seeds, media, and secrets.

## Choose the app mode before editing

Use the smallest matching mode and state the choice in the plan:

| Mode | Additional modules | Install-only | Content | Polished |
| --- | --- | --- | --- | --- |
| Company profile | none | scaffold and checks only | business copy/pages with stock UI | copy, deliberate theme work, and local generated raster assets |
| Product commerce | `orders` (which requires `catalog`) | modules and migrations only | products, categories, prices, and inventory | content plus a cohesive storefront theme and product imagery |
| Service commerce | `booking` (which requires `orders` and `catalog`) | modules and migrations only | services plus `range` and/or `slot` scheduling data | content plus a cohesive booking experience and service imagery |

Do not infer a higher maturity level than the request authorizes. Install-only means stop after
the module and migration checks. Content mode keeps packaged layout and components. Polished mode
may add a focused `src/theme/` override or app-owned static business page, but must not fork
module-owned commerce routes.

## Implementation rules

- Put store identity, palette, locale, messages, and storefront copy in the `brand` block of
  `astro.config.mjs`.
- Use packaged `@takontuku/ui` components and semantic `--tk-*` tokens before creating custom
  markup or hard-coded colors.
- Add or remove features through `bunx takontuku add <module>` or
  `bunx takontuku remove <module>`; never hand-edit the dependency, `modules` array, or
  middleware registration to simulate an install.
- Keep module-specific routes and admin surfaces in the module that owns them. For optional
  modules, use Takontuku virtual modules and runtime guards rather than static imports that make
  the base scaffold fail to build.
- Add store-specific starting data under `seed/`; use `bunx takontuku db sync` for module
  migrations and append-only project migrations for schema changes.
- Prefer a small, complete vertical slice over speculative pages. Keep generated media and
  copy replaceable when the brief does not provide final assets.
- For a company profile, app-owned static pages and sections are valid because there is no
  commerce module to own them. For product and service commerce, keep catalog, cart, checkout,
  booking, and admin routes in their installed modules.
- Treat generated assets as project files: save them under the app, reference them locally, and
  keep an asset manifest so unused or missing files are easy to detect.

## Finish and report

Run the narrowest relevant checks, then the full project checks when the change crosses module
or configuration boundaries: `bun run cf-typegen`, `bun run typecheck`, `bun run lint`,
`bun run build`, and local migration/seed commands when data changed. Finish with a concise report
that includes selected mode/modules, changed surfaces, seed/migration actions, assumptions,
validation evidence, recommendations, and explicit over-engineering and under-engineering findings.
