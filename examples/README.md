# Karsa AI fixture matrix

These twelve fixtures cover four Karsa presets at three bounded tiers. Generation, bounded repair,
and review metadata use `gpt-5.6-luna` with `max` reasoning. `FACTS.json` is produced by the
deterministic checker; `EVALUATION.md` is rendered from schema-validated review JSON.

| Fixture family | Brand | Install | Content | Polished |
| --- | --- | --- | --- | --- |
| Company | Arunika Energi | auth, closed registration | profile copy | profile copy, palette, 3 local assets |
| Product | Racik Rasa | catalog + orders | 6 products + inventory | content, palette, 5 local assets |
| Service | Teman Ekor | services + inquiries + booking | 3 services + range/slot schedules | content, palette, local service assets |
| Publication | Karsa Journal | content + closed registration | published, draft, archived posts | content, palette, 1 local asset |

The company and publication presets keep authentication closed and expose no public registration.
Product uses public registration and module-owned products, cart, checkout, and orders. Service uses
public registration with catalog `services`, orders `inquiries`, and booking; it has no cart,
checkout, product, or order storefront. Publication content is owned by `@karsa/content`, including
safe draft preview, publishing, archiving, RSS, and the canonical sitemap contribution.

Install fixtures stop at package/module wiring, migration collection, and registry plumbing. Content
fixtures add only approved copy and idempotent local seed data. Polished fixtures add a focused
palette/design manifest and deterministic local raster assets; they do not fork module-owned routes.

Every fixture contains `karsa.migrations.json`, package dependencies resolved from version `0.3.0`,
and the five source Karsa skills copied byte-for-byte into both `.agents/skills/` and
`.claude/skills/`. `SCREENSHOT-METADATA.json` records the desktop/mobile viewport and visual scoring
status; absent browser captures are explicitly marked `not-captured`.

Run the checker from the repository root:

```sh
bun tools/ai-fixture-eval/check.ts examples/<fixture-name>
bun tools/ai-fixture-eval/render-review.ts examples/<fixture-name>
```

Use `bun tools/ai-fixture-eval/run-metadata.ts` before any generator or review mutation. Old fixture
names and legacy reviewer artifacts are intentionally not part of this matrix.
