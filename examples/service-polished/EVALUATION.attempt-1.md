# Terra Review: service-polished

## Verdict

**NEEDS_REVISION — 74/100**

All deterministic invariants passed.

## Rubric (100 points)

| Area | Score | Max |
| --- | ---: | ---: |
| Checks, migration, seed, route | 21 | 30 |
| Takontuku module/data architecture | 18 | 25 |
| Category and tier fit | 15 | 20 |
| Content, UX, responsive design, assets | 12 | 15 |
| Maintainability and proportionality | 8 | 10 |
| **Total reported by rubric** | **74** | **100** |

## Evidence

- FACTS.json records the expected service-polished module set, four local raster assets, and no checker findings.
- astro.config.mjs sets Teman Ekor’s id-ID/IDR/Asia-Jakarta brand configuration, custom light/dark accent palette, local hero, and catalog/orders/booking modules.
- seed/teman-ekor.sql defines Penitipan Hewan as a 1–14 day range service and Grooming & Spa plus Jalan-Jalan as slot services, with idempotent INSERT OR IGNORE / NOT EXISTS guards.
- migrations/0006_booking_init.sql provides booking_item_schedule, booking_slots, and booking_order_bookings tables; scheduled services are distinct from inventory.
- ../../packages/booking/src/index.ts registers /booking/[id], /admin/bookings, and admin booking API routes; catalog and orders similarly register their owned catalog/order routes.
- ../../packages/catalog/src/product-form.ts stores admin-entered prices as Math.round(price * 100), while catalog routes display money(product.priceCents / 100); this establishes the seeded price-unit error.
- ../../packages/catalog/src/index.ts registers demo-catalog.sql as a module seed, and ../../packages/create-takontuku/src/report.ts states db seed runs module seeds plus the app seed.
- DESIGN.md and the four attached PNGs align on one local hero plus three local service visuals; no desktop or mobile page screenshots were supplied, so no page-level visual assertions were made.

## Strengths

- Correct service module set and dependency order are configured: auth, catalog, orders, and booking.
- Three scheduled Teman Ekor services use both required schedule modes; scheduled items appropriately have no inventory rows.
- All four required local PNG assets exist, are referenced locally, and the supplied images show polished pet-care visuals without visible watermarks or legible text.
- Booking, catalog, order, and admin booking routes are contributed by their owning packages rather than forked into the app.

## Gaps

- **HIGH** All three seeded price_cents values are 100× too small for the catalog’s major-unit formatter, so the displayed rates are Rp1.250, Rp1.500, and Rp750 rather than Rp125.000, Rp150.000, and Rp75.000. — seed/teman-ekor.sql
- **HIGH** Local seeding includes the catalog package’s unrelated physical-goods demo catalog and media in addition to Teman Ekor services, contaminating the storefront, catalog, cart, checkout, and admin inventory. — ../../packages/catalog/src/index.ts

## Recommendations

- None reported

## Production gaps

- **HIGH** Slot capacity is recorded but not enforced; concurrent booking requests can exceed the configured capacity and are only surfaced as clashes in admin. — migrations/0006_booking_init.sql
- **MEDIUM** The Wrangler D1 database ID remains the all-zero local-development placeholder, so deployment requires environment configuration. — wrangler.jsonc

## Over-engineered

- None reported

## Under-engineered

- None reported
