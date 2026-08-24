# Karsa repository instructions

This repository is the Karsa workspace. Read this file before editing and use the package or app
that owns a surface rather than copying its implementation into another package.

## Naming and scope

- New package/import names use `@karsa/*`; CLI commands use `karsa` and `create-karsa`.
- Theme overrides use semantic `--karsa-*` tokens.
- Legacy brand/package/CLI identifiers belong only in the migration/history documentation.
- Keep edits focused. `examples/**` is a generated acceptance matrix and may contain user changes;
  do not edit it during normal docs or package work.

## Docs

The docs app is bilingual. Add or update paired files under `apps/docs/src/content/docs/en/` and
`apps/docs/src/content/docs/id/` at the same relative path. Keep the sidebar labels translated,
run `bun run --cwd apps/docs parity`, and use `/en/` or `/id/` links. Core guidance is site-neutral;
put product, service, or publication-specific terms in the matching guide.

The migration page is the explicit allowlist for old identifiers. Do not repeat those identifiers
in new guides, skills, README copy, or code examples.

## Architecture

- `astro.config.mjs` is the source of truth for brand and installed modules.
- Use `@karsa/ui` and `@karsa/theme` before custom UI; prefer semantic tokens and native semantics.
- Add/remove modules with `bunx karsa add/remove`; do not hand-edit module dependencies or middleware.
- Module-owned routes, navigation, widgets, migrations, seeds, and media prefixes stay in modules.
- Company pages may be app-owned Astro pages; service integrations use module-boundary adapters;
  publication entries belong to the content layer.
- Migrations are append-only. Seeds are local-only and must be idempotent.

## Validation

Run the narrowest relevant checks, then broader checks for cross-package changes:

```sh
bun run typecheck
bun run lint
bun run build
```

For docs run parity and the docs build. For data changes run local migration/seed checks. Report
the selected preset/tier, assumptions, ownership, evidence, and explicit over/under-engineering
findings. Never increase an install/content/polished tier without permission.
