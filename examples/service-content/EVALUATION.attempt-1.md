# Terra Review: service-content

## Verdict

**NEEDS_REVISION — 72/100**

All deterministic invariants passed.

## Rubric (100 points)

| Area | Score | Max |
| --- | ---: | ---: |
| Checks, migration, seed, route | 18 | 30 |
| Takontuku module/data architecture | 21 | 25 |
| Category and tier fit | 14 | 20 |
| Content, UX, responsive design, assets | 10 | 15 |
| Maintainability and proportionality | 9 | 10 |
| **Total reported by rubric** | **72** | **100** |

## Evidence

- FACTS.json reports expected modules, zero app-local raster assets, and no checker findings.
- astro.config.mjs configures Teman Ekor with id-ID, IDR, Asia/Jakarta, and auth/jarene/catalog/orders/booking modules.
- migrations/0006_booking_init.sql supplies booking schedules, slots, and order-booking tables after catalog/orders migrations.
- seed/teman-ekor.sql inserts Penitipan Hewan, Grooming & Spa, and Dog Walking; it creates three schedules with range and slot modes plus four active slots using INSERT OR IGNORE/NOT EXISTS guards.
- src/middleware.ts imports @takontuku/booking/register, and ../../packages/booking/src/index.ts contributes /booking/[id] and /admin/bookings routes.
- ../../packages/core/src/cli/db-seed.ts executes module seed SQL and media before seed/teman-ekor.sql; ../../packages/catalog/seeds/demo-catalog.sql contains six non-Teman-Ekor physical catalog rows.
- ../../packages/catalog/src/routes/products/[id].astro renders money(product.priceCents / 100), establishing the price-unit discrepancy.
-  .astro/dev.log records 302 responses for /booking/7, /booking/8, /booking/9, and /admin/bookings, not completed booking/admin flows.

## Strengths

- Configured auth, catalog, orders, and booking modules match the service fixture; booking is registered in middleware.
- The local seed defines exactly three Teman Ekor scheduled items, one range schedule and two slot schedules, with idempotent SQL guards.
- Scheduled services correctly avoid inventory rows; the catalog package suppresses stock/cart controls for non-physical fulfillment.
- No app-owned theme directory, raster assets, or commerce/booking/admin route forks were found.

## Gaps

- **HIGH** Running the documented local seed also runs catalog's six unrelated physical demo products and uploads their six WebP images before the Teman Ekor SQL. The resulting local storefront is not limited to the intended business services. — ../../packages/catalog/src/index.ts
- **HIGH** Service price_cents values are 100× too small for the stated IDR prices: catalog rendering divides cents by 100, so 125000, 150000, and 75000 display as approximately Rp1.250, Rp1.500, and Rp750. — seed/teman-ekor.sql
- **MEDIUM** Supplied runtime evidence only shows redirects for booking and admin-booking URLs; it does not demonstrate successful range/slot submissions, admin visibility, or typecheck/lint/build completion. — .astro/dev.log

## Recommendations

- None reported

## Production gaps

- None reported

## Over-engineered

- None reported

## Under-engineered

- None reported
