---
name: karsa-site-builder
description: Use when a brief asks for a complete Karsa site or substantial cross-cutting change that requires choosing a preset and maturity tier, planning pages/data/modules, or validating ownership. Do not use for one isolated component or generic Astro work.
license: MIT
metadata:
  package: "@karsa/core"
---

# Karsa site builder

Turn a site brief into the smallest cohesive implementation while preserving module ownership and the requester's scope. The word “site” includes company, product, service, and publication experiences; the workflow remains site-neutral until the preset is selected.

## Select preset and tier first

Before touching files, name one preset and one authorized tier:

| Preset | Domain boundary | Default implementation |
| --- | --- | --- |
| Company | Organization profile, marketing, or public information | App-owned Astro pages and sections |
| Product | Items with prices, inventory, cart, or checkout | Product/order modules own domain routes; app owns brand pages |
| Service | Services with availability, ranges, slots, or appointments | Service modules own scheduling; external systems use narrow adapters |
| Publication | Articles, notes, documentation, or editorial feeds | Content layer owns entries; app owns shell and editorial landing pages |

| Tier | Allowed work | Stop condition |
| --- | --- | --- |
| Install | Package/module installation, config wiring, and registry/migration checks | Stop before adding content or polish |
| Content | Install plus approved copy, content records, seed data, and local assets | Keep packaged layout and theme |
| Polished | Content plus deliberate theme overrides and requested local/generated assets | Keep the vertical slice; do not invent a design system |

Never raise `install` to `content`, or `content` to `polished`, without permission. If the brief is ambiguous, choose the lowest tier that satisfies it, state the assumption, and ask before expanding the scope.

## Inspect before implementation

Read `AGENTS.md` and the small `CLAUDE.md` bridge if present. Then inspect:

1. `astro.config.mjs`, `package.json`, and the lockfile;
2. the resolved `virtual:karsa/registry` and installed module list;
3. existing app-owned `src/pages/`, layouts, theme overrides, and static assets;
4. `seed/`, migrations, and media manifests;
5. module-owned routes, contribution contracts, and middleware registration.

Write a compact plan with preset, tier, modules, pages, data, assets, ownership, assumptions, and checks. Use the focused skills: `karsa-ui`, `karsa-modules`, and `karsa-data`.

## Implementation boundaries

- Put identity, palette, locale, time zone, and copy in the `brand` block passed to `karsa()`.
- Use `@karsa/ui` and semantic `--karsa-*` tokens before custom markup or hard-coded colors.
- Add/remove modules with `bunx karsa add <module>` and `bunx karsa remove <module>`; never hand-edit the dependency, `modules` array, or middleware registration.
- For a company preset, app-owned Astro pages are valid and preferred for profile/marketing content.
- For a service preset, use the installed service module and a narrow adapter for external availability/payment; do not copy scheduling state into a page.
- For a publication preset, put articles and editorial metadata in the content layer; do not force them into a transactional module.
- For a product preset, keep product, cart, order, checkout, and admin routes in their owning modules. Product-specific terms and implementation belong in that guide, not in generic site foundations.
- Add site-specific starting data under `seed/`; use `bunx karsa db sync` for module migrations and append-only project migrations for schema changes.
- Keep generated assets under the project with a manifest. Do not claim an asset exists until its path and rendering are checked.

## Required five-surface check

Before reporting completion, inspect and record evidence for all five surfaces:

1. **Config:** brand, modules, locale, bindings, secrets, and tier assumptions.
2. **Registry:** resolved module names, routes, nav, widgets, media prefixes, migrations, and seeds.
3. **Pages:** requested routes, locale links, metadata, accessibility, and app/module ownership.
4. **Seed:** idempotent SQL, media keys, local-only behavior, and truthful zero states.
5. **Ownership:** what belongs to the app, a module, an adapter, or the content layer, plus the removal test.

If one surface is unavailable, report the blocker instead of filling the gap with speculative code.

## Validation and handoff

Run the narrowest relevant checks, then the full checks when the change crosses boundaries:

```sh
bun run cf-typegen
bun run typecheck
bun run lint
bun run build
```

For data changes, also run local migration and seed checks. For module changes, add/remove the module in a disposable project or use the registry tests. For content changes, run the locale parity check and link/accessibility checks.

The final report must include selected preset and tier, changed surfaces, modules, seed/migration/media actions, assumptions, validation commands and observations, and evidence links or paths.

Always include two explicit scope findings:

- **Over-engineering:** abstractions, modules, assets, or routes intentionally not added because the tier or brief did not authorize them.
- **Under-engineering:** missing copy, data, integrations, accessibility review, tests, or deployment work still required before release.
