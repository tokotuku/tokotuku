# Karsa Review: publication-content

## Verdict

**PASS — 100/100**

All deterministic invariants passed.

## Rubric (100 points)

| Area | Score | Max |
| --- | ---: | ---: |
| Checks, migration, seed, route | 30 | 30 |
| Karsa module/data architecture | 25 | 25 |
| Category and tier fit | 20 | 20 |
| Content, UX, responsive design, assets | 15 | 15 |
| Maintainability and proportionality | 10 | 10 |
| **Total reported by rubric** | **100** | **100** |

## Desktop/mobile evidence

| View | Status | Viewport | Screenshot | Score |
| --- | --- | ---: | --- | ---: |
| Desktop | not-captured | 1440×1000 | — | — |
| Mobile | not-captured | 390×844 | — | — |

Scoring: **not-scored** — browser capture unavailable. Visual scoring is deferred until a local browser capture is supplied.

## Evidence

- FACTS.json records auth and content modules, zero custom assets, and zero deterministic checker findings.
- astro.config.mjs configures Karsa Journal with closed auth and @karsa/content; no catalog, orders, or booking module is installed.
- seed/001-journal.sql inserts or updates one published, one draft, and one archived post idempotently.
- The content module migration is tracked at sequence 1 in karsa.migrations.json.
- src/pages/robots.txt.ts exposes the content sitemap while adding no commerce paths.
- SCREENSHOT-METADATA.json records desktop and mobile as not-captured; no rendered-layout claim was made.

## Strengths

- Karsa Journal uses closed auth and lets @karsa/content own posts, draft preview, publish/archive state, RSS, sitemap, and archive routes.
- The idempotent journal seed covers published, draft, and archived post states without copying module-owned routes into the app.
- The content tier adds editorial data while keeping theme overrides and custom imagery out of the fixture.

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
