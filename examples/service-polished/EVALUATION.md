# Karsa Review: service-polished

## Verdict

**PASS — 89/100**

All deterministic invariants passed.

## Rubric (100 points)

| Area | Score | Max |
| --- | ---: | ---: |
| Checks, migration, seed, route | 29 | 30 |
| Karsa module/data architecture | 23 | 25 |
| Category and tier fit | 17 | 20 |
| Content, UX, responsive design, assets | 12 | 15 |
| Maintainability and proportionality | 8 | 10 |
| **Total reported by rubric** | **89** | **100** |

## Desktop/mobile evidence

| View | Status | Viewport | Screenshot | Score |
| --- | --- | ---: | --- | ---: |
| Desktop | captured | 1440×1000 | `screenshots/desktop.jpg` | 94 |
| Mobile | captured | 390×844 | `screenshots/mobile.jpg` | 94 |

Scoring: **94/100** — service vocabulary, responsive layout, local imagery, contrast, overflow, and browser console were inspected at both required viewports with no commerce copy or console issues.

## Evidence

- FACTS.json reports the expected modules, four local raster assets, and zero checker findings after the repaired seed timestamp.
- Direct read-only SQLite execution of migrations, the catalog demo seed, and seed/teman-ekor.sql twice returned: 3 total items, 0 TOKO items, 3 scheduled items, 0 scheduled inventory rows, range|slot|slot schedules, and 4 slots on both runs.
- seed/teman-ekor.sql:19,34,49 preserve the three generated services/* image keys and use correct minor-unit prices.
- astro.config.mjs:19-38 configures Teman Ekor with id-ID, IDR, Asia/Jakarta, local hero media, and auth/jarene/catalog/orders/booking modules.
- src/pages/index.astro:1 delegates site composition to the packaged SiteHome; ../../packages/booking/src/index.ts registers /booking/[id] and /admin/bookings.
- bun run lint completed successfully with only Biome’s deprecated-config informational notice. bun run typecheck could not complete because this read-only environment prevents Astro from refreshing .astro/integrations/_astrojs_cloudflare/cloudflare.d.ts; this is not a source diagnostic.
- Desktop and mobile captures confirm the service-specific homepage, local imagery, readable responsive hierarchy, and absence of product/order/cart vocabulary.

## Strengths

- The installed module set matches the required service-commerce stack, with catalog, orders, and booking registered through their owning packages.
- The local seed is repeatable: two complete in-memory SQLite runs produced exactly 3 services, 0 TOKO rows, 1 range plus 2 slot schedules, 4 slots, and 0 scheduled-service inventory rows.
- Seeded IDR minor units are correct: 12500000, 15000000, and 7500000 are rendered by the catalog’s cents-to-major-unit formatter as Rp125.000, Rp150.000, and Rp75.000.
- All four required local PNGs exist at the manifest paths with the specified dimensions; the inspected assets are distinct, relevant pet-care imagery with no visible text or watermark.
- Booking, catalog, orders, and admin surfaces are module-contributed rather than app-forked.

## Gaps

- The service presentation adapter supplies service-specific vocabulary and hides product, stock, cart, and order surfaces; the fixture therefore has no physical-goods copy gap.

## Recommendations

- None reported

## Production gaps

- **HIGH** Slot capacity is stored but never enforced at request creation; overlapping requests are accepted and only flagged for an administrator afterward. — ../../packages/booking/src/routes/booking/[id].astro:46
- **INFO** Remote deployment still requires real D1 configuration because the committed database ID is the documented all-zero local-development placeholder. — wrangler.jsonc:21

## Over-engineered

- None reported

## Under-engineered

- **MEDIUM** The demo cleanup targets every SKU beginning with TOKO-, rather than the catalog module’s exact demo identities; a future local item using that prefix would be removed during seeding. — seed/teman-ekor.sql:6
