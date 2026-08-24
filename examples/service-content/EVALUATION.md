# Karsa Review: service-content

## Verdict

**PASS — 97/100**

All deterministic invariants passed.

## Rubric (100 points)

| Area | Score | Max |
| --- | ---: | ---: |
| Checks, migration, seed, route | 28 | 30 |
| Karsa module/data architecture | 25 | 25 |
| Category and tier fit | 20 | 20 |
| Content, UX, responsive design, assets | 14 | 15 |
| Maintainability and proportionality | 10 | 10 |
| **Total reported by rubric** | **97** | **100** |

## Desktop/mobile evidence

| View | Status | Viewport | Screenshot | Score |
| --- | --- | ---: | --- | ---: |
| Desktop | not-captured | 1440×1000 | — | — |
| Mobile | not-captured | 390×844 | — | — |

Scoring: **not-scored** — browser capture unavailable. Visual scoring is deferred until a local browser capture is supplied.

## Evidence

- Review-supplied controlled two-cycle SQLite evidence reports TE=3, TOKO=0, empty images=0, prices=12500000/15000000/7500000, range=1, slot=2, orphan inventory=0, TE inventory=0, slots=4, and checker=0 errors/0 warnings/0 assets.
- seed/teman-ekor.sql defines the three TE SKUs, corrected minor-unit prices, non-empty packaged catalog image keys, one range schedule, two slot schedules, and four guarded slot inserts; it deletes TOKO rows and their inventory first.
- FACTS.json lists the required auth, catalog, orders, and booking modules, no app-local assets, and no findings.
- astro.config.mjs configures Teman Ekor for id-ID, IDR, Asia/Jakarta and installs catalog, orders, and booking; src/middleware.ts registers booking and catalog hooks.
- migrations/0006_booking_init.sql supplies booking_item_schedule, booking_slots, and booking_order_bookings after catalog and orders migrations.
- ../../packages/booking/src/index.ts owns /booking/[id] and /admin/bookings; ../../packages/booking/src/routes/booking/[id].astro has distinct range and slot submission validation, while routes/admin/bookings.astro lists and distinguishes both modes.
- No direct HTTP or screenshot claim is made: the Wrangler local listener was environment-blocked, so route behavior was assessed from source.

## Strengths

- The service fixture contains exactly three scheduled Teman Ekor services with the requested range/slot schedule mix and four active slots.
- The local seed removes catalog demo rows after each module seed cycle, is idempotent, and uses packaged catalog image keys without app-owned imagery.
- Booking, catalog, orders, and admin-booking routes remain module-owned; the app only registers modules and renders the packaged SiteHome.

## Gaps

- None reported

## Recommendations

- None reported

## Production gaps

- None reported

## Over-engineered

- None reported

## Under-engineered

- None reported
