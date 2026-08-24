# Karsa 0.3.0 brand assets

Modern Nusantara identity created on 2026-08-23. The system uses a single-color abstract K built from two nesting geometric fields: a softened maker's stem with a keyed center, and a folded chevron that suggests an over-under weave without depicting a literal textile or retail object.

## Final exploration prompt

Built-in ImageGen was used in the `logo-brand` mode. The selected direction came from this prompt:

> Use case: logo-brand  
> Asset type: identity exploration sheet for a software design system  
> Primary request: Create direction 2 for “Karsa”: an abstract uppercase K assembled from exactly two interlocking solid geometric fields. One field is a compact softened vertical lozenge; the other is a folded angular ribbon that passes through its middle, using one bold ivory counter-space to imply an over-under weave. Avoid a conventional typed K; create a memorable modular silhouette.  
> Scene/backdrop: absolutely flat plain warm ivory background, evenly lit, no texture  
> Style/medium: precise flat vector-logo exploration, one solid teak-brown ink only  
> Composition/framing: centered large standalone mark, combined horizontally with the exact wordmark “Karsa” in Manrope Semibold style; below, a simple row of the mark at simulated 16 px, 24 px, and 32 px  
> Color palette: teak brown `#7A4B32` on ivory `#F7F0E4`  
> Text (verbatim): “Karsa”  
> Constraints: two fields only; strong distinct silhouette; open counter-space; legible at 16/24/32 px; calm contemporary spacing; monochrome-capable; warm but software-modern; original design; generous padding  
> Avoid: conventional plain letter K, shopping cart, storefront, house, bag, roof, literal batik, textile pattern, loom illustration, gradient, glow, vignette, thin lines, tiny details, mockup, 3D, shadows, watermark, extra text

## ImageGen usage and decision

Three raster-only exploration sheets were generated with the built-in ImageGen tool:

1. Open folded-chevron K: clear but too close to a conventional rounded K.
2. Keyed lozenge and folded field: selected for its stable small-size silhouette, strong monochrome read, balanced weight beside Manrope Semibold, and lack of store-icon cues.
3. Asymmetric pinwheel join: more kinetic at large size, but its center became busy at 16 px.

ImageGen established the concept space only. No generated pixels or automatic tracing are present in the shipped mark.

## SVG source rationale

The selected idea was reconstructed by hand on a `128 × 128` coordinate grid as two deterministic filled SVG paths. Broad stems, ten-unit optical separation at the keyed join, and slightly softened corners preserve the K at favicon sizes. The geometry contains no strokes, filters, clipping, gradients, masks, or thin detail, so it recolors cleanly for monochrome use.

The horizontal logos retain the exact accessible text `Karsa` and request the product's existing `Manrope Variable`/`Manrope` family at weight `600` with calm `1.2` unit spacing. Consumers should load the repository theme fonts before displaying the SVG; the fallback stack is present for defensive rendering. The separate dark logo uses ivory because teak does not provide sufficient contrast on the char background.

## Palette

| role | value | use |
| --- | --- | --- |
| Teak | `#7A4B32` | Primary mark and light-theme wordmark |
| Ivory | `#F7F0E4` | Warm canvas and dark-theme logo |
| Char | `#201B17` | Dark canvas |
| Clay | `#B66A44` | Supporting accent; not used inside the mark |

## Outputs

| file | dimensions / viewBox | background | purpose |
| --- | --- | --- | --- |
| `karsa-mark.svg` | `128 × 128` viewBox | Transparent | Canonical deterministic mark source |
| `karsa-mark-512.png` | `512 × 512` | Transparent | High-resolution raster mark |
| `karsa-logo.svg` | `336 × 128` viewBox | Transparent | Teak horizontal logo for light surfaces |
| `karsa-logo-dark.svg` | `336 × 128` viewBox | Transparent | Ivory horizontal logo for dark surfaces |
| `favicon.svg` | `128 × 128` viewBox | Transparent | Theme-aware vector favicon |
| `favicon-32.png` | `32 × 32` | Transparent | Teak legacy PNG favicon |
| `preview-light.png` | `1600 × 1000` | Ivory | Light-theme identity specimen |
| `preview-dark.png` | `1600 × 1000` | Char | Dark-theme identity specimen |

## QA record

| check | result |
| --- | --- |
| 16 px | Pass — the K silhouette remains identifiable; the join reduces to a deliberate single-pixel counter |
| 24 px | Pass — both fields and the keyed weave are distinct |
| 32 px | Pass — softened corners and optical gap remain clean |
| Light theme | Pass — teak on ivory is clear and warm without losing software precision |
| Dark theme | Pass — ivory on char retains the same silhouette with high contrast |
| Monochrome | Pass — exactly one foreground color, no opacity effects, and no tonal dependency |
| Wordmark | Pass — exact text `Karsa`, weight `600`, balanced against the 112-unit mark in the horizontal lockup |
| Retail-icon exclusion | Pass — no cart, bag, storefront, house, roof, literal batik, gradient, or pictorial detail |

