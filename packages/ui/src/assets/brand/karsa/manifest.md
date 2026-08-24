# Karsa 0.3.0 brand assets

Canonical identity selected on 2026-08-24. The mark is a single-color rounded frame holding a negative-space K. The frame represents inner strength and intention; the open diagonals preserve forward movement without pushing the letter off-center.

## Construction

The mark is built on a `128 × 128` coordinate grid. Its outer frame has equal optical padding and softened corners. The K is shifted slightly left of its geometric bounding-box center because the two diagonal arms carry more perceived weight than the vertical stem. The diagonal reach is shortened to keep a stable right-side margin at favicon sizes.

All shipped identity assets are PNG. The horizontal lockups use the repository's Manrope Variable family at weight `600` and have separate light- and dark-surface exports. The standalone mark and favicons keep a fixed teak frame with an ivory K so their counters remain legible on either surface without runtime recoloring.

## Palette

| role | value | use |
| --- | --- | --- |
| Teak | `#7A4B32` | Primary mark and light-surface wordmark |
| Ivory | `#F7F0E4` | Warm canvas and dark-surface logo |
| Char | `#201B17` | Dark canvas |
| Clay | `#B66A44` | Supporting brand accent; not used inside the mark |

## Outputs

| file | dimensions | background | purpose |
| --- | --- | --- | --- |
| `karsa-mark.png` | `512 × 512` | Transparent outside the tile | Canonical surface-independent mark used by `BrandMark` |
| `karsa-mark-512.png` | `512 × 512` | Transparent outside the tile | Explicit high-resolution mark export |
| `karsa-logo.png` | `1440 × 512` | Transparent | Teak horizontal logo for light surfaces |
| `karsa-logo-dark.png` | `1440 × 512` | Transparent | Ivory horizontal logo for dark surfaces |
| `favicon.png` | `64 × 64` | Transparent | Default browser favicon |
| `favicon-32.png` | `32 × 32` | Transparent | Small compatibility favicon |
| `preview-light.png` | `1600 × 1000` | Ivory | Light-theme identity specimen |
| `preview-dark.png` | `1600 × 1000` | Char | Dark-theme identity specimen |

## QA record

| check | result |
| --- | --- |
| 16 px | Pass — the framed K remains recognizable with a clear right-side margin |
| 24 px | Pass — the stem and diagonals retain distinct geometry |
| 32 px | Pass — frame radius and optical centering remain clean |
| Light theme | Pass — teak on ivory is warm and legible |
| Dark theme | Pass — ivory on char preserves the same silhouette |
| Flat color | Pass — fixed teak and ivory with no gradient, shadow, or opacity dependency |
| Wordmark | Pass — Manrope Variable Semibold with tightened spacing |
| Retail-icon exclusion | Pass — no cart, bag, storefront, house, roof, textile motif, gradient, or pictorial detail |
