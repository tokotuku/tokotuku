# Terra Review: service-install

## Verdict

**NEEDS_REVISION — 95/100**

All deterministic invariants passed.

## Rubric (100 points)

| Area | Score | Max |
| --- | ---: | ---: |
| Checks, migration, seed, route | 30 | 30 |
| Takontuku module/data architecture | 25 | 25 |
| Category and tier fit | 15 | 20 |
| Content, UX, responsive design, assets | 15 | 15 |
| Maintainability and proportionality | 10 | 10 |
| **Total reported by rubric** | **95** | **100** |

## Evidence

- FACTS.json reports expected business modules auth, catalog, orders, booking (plus scaffold-default jarene), zero assets, and no findings.
- astro.config.mjs declares modules [auth(), jarene(), catalog(), orders(), booking()]; package.json declares all corresponding @takontuku dependencies.
- Package source confirms booking requires catalog and orders and contributes /booking/[id] and /admin/bookings; catalog and orders contribute their own commerce routes in packages/booking/src/index.ts, packages/catalog/src/index.ts, and packages/orders/src/index.ts.
- src/pages contains only index.astro and robots.txt.ts; src/theme and seed are absent.
- takontuku.migrations.json has nextSequence 7 and migration files 0000 through 0006 match the installed module migration sequence.
- The local D1 d1_migrations table lists all seven migrations, including 0006_booking_init.sql, applied at 2026-08-22 02:49:33.
- RUN-METADATA.json records the requested and effective generator as gpt-5.6-luna with medium reasoning effort.
- No desktop or mobile screenshots were supplied.

## Strengths

- Booking, orders, and catalog are installed with their required dependencies and module registrations.
- All seven collected module migrations are present and applied locally.
- The fixture remains install-only: no app seed directory, theme override, custom raster assets, or app-owned commerce/booking routes.

## Gaps

- **MEDIUM** Configured brand name is "Service Install", not the required Teman Ekor. — astro.config.mjs:19

## Recommendations

- None reported

## Production gaps

- **LOW** The D1 database ID remains the documented all-zero local-development placeholder, so this configuration is not deployable to a real D1 database unchanged. — wrangler.jsonc:19

## Over-engineered

- None reported

## Under-engineered

- None reported
