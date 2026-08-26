# Karsa Review: publication-install

## Verdict

**PASS — 96/100**

All deterministic invariants passed.

## Rubric (100 points)

| Area | Score | Max |
| --- | ---: | ---: |
| Checks, migration, seed, route | 29 | 30 |
| Karsa module/data architecture | 25 | 25 |
| Category and tier fit | 20 | 20 |
| Content, UX, responsive design, assets | 14 | 15 |
| Maintainability and proportionality | 8 | 10 |
| **Total reported by rubric** | **96** | **100** |

## Desktop/mobile evidence

| View | Status | Viewport | Screenshot | Score |
| --- | --- | ---: | --- | ---: |
| Desktop | not-captured | 1440×1000 | — | — |
| Mobile | not-captured | 390×844 | — | — |

Scoring: **not-scored** — browser capture unavailable. Visual scoring is deferred until a local browser capture is supplied.

## Evidence

- FACTS.json records modules auth and content, zero assets, and zero deterministic checker findings.
- astro.config.mjs sets brand.name to Karsa Journal, auth registration to closed, and modules to auth plus content.
- migrations/0001_content_init.sql and karsa.migrations.json record the content module at sequence 1.
- No seed/, src/theme/, or public/ directory exists, matching the install-tier boundary.
- SCREENSHOT-METADATA.json records desktop and mobile as not-captured; no visual claims were inferred.

## Strengths

- Brand is exactly Karsa Journal and the config installs closed auth plus the content module with no commerce modules.
- The fixture is install-only: it has migrations and no seed data, theme override, or custom raster assets.
- The content module owns editorial routes and its migration; the app-owned surface is only the packaged SiteHome entry point and module-aware robots route.

## Gaps

- **HIGH** The Wrangler D1 binding still uses the all-zero local-development placeholder and needs a provisioned ID before remote deployment. — wrangler.jsonc

## Recommendations

- **P1** Replace the local D1 placeholder with the provisioned database UUID before remote migration or deployment. — wrangler.jsonc

## Production gaps

- **HIGH** Remote database operations are not ready while the all-zero local-development binding remains configured. — wrangler.jsonc

## Over-engineered

- None reported

## Under-engineered

- None reported
