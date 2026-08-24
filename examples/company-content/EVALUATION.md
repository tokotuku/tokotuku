# Karsa Review: company-content

## Verdict

**PASS — 92/100**

All deterministic invariants passed.

## Rubric (100 points)

| Area | Score | Max |
| --- | ---: | ---: |
| Checks, migration, seed, route | 28 | 30 |
| Karsa module/data architecture | 25 | 25 |
| Category and tier fit | 20 | 20 |
| Content, UX, responsive design, assets | 11 | 15 |
| Maintainability and proportionality | 8 | 10 |
| **Total reported by rubric** | **92** | **100** |

## Desktop/mobile evidence

| View | Status | Viewport | Screenshot | Score |
| --- | --- | ---: | --- | ---: |
| Desktop | not-captured | 1440×1000 | — | — |
| Mobile | not-captured | 390×844 | — | — |

Scoring: **not-scored** — browser capture unavailable. Visual scoring is deferred until a local browser capture is supplied.

## Evidence

- FACTS.json records expected auth module (with baseline jarene), zero assets, and an empty checker findings array.
- astro.config.mjs defines Arunika Energi with id-ID, IDR, Asia/Jakarta, auth and jarene only; it contains no palette or auth-image override.
- src/pages/index.astro supplies anchored About, Capabilities, Projects, and Contact sections; contact includes mailto, telephone, and Jakarta office details.
- src/pages/index.astro composes packaged Karsa UI components and uses semantic --karsa-* styling with a max-width: 760px responsive breakpoint.
- FACTS.json file list contains no src/theme directory, and assets is an empty array.

## Strengths

- Company-profile positioning, capabilities, profile, CTA, and contact are all present on the home route.
- Uses Karsa Layout, SiteHeader, SiteFooter, and Card components with semantic --karsa-* tokens.
- The page includes a mobile breakpoint and no custom raster or external image assets.

## Gaps

- **MEDIUM** The two "Jejak dan proyek" cards describe themes and intentions, but provide no specific project, outcome, client, metric, or other concrete proof. — src/pages/index.astro

## Recommendations

- **P2** Replace the generic project cards with approved case-study facts or measurable outcomes when they become available. — src/pages/index.astro

## Production gaps

- **MEDIUM** Project proof is not independently verifiable from the supplied content; production copy should use approved factual references before presenting it as evidence. — src/pages/index.astro

## Over-engineered

- None reported

## Under-engineered

- None reported
