# @tokotuku/tokens

Design tokens for Tokotuku UI: the raw value scales that `@tokotuku/theme` and `@tokotuku/elements` are built from.

## Overview

Tokens are plain, framework-agnostic values — no CSS, no components. Semantic mapping (e.g. deciding that `brand.600` is the "primary button background") happens one layer up, in `@tokotuku/theme`.

Categories: `spacing`, `fontFamily` / `fontSize` / `fontWeight` / `lineHeight`, `neutral` / `brand` / `red` / `amber` / `green` (color ramps), `radius`, `shadow`, `duration` / `easing`, `zIndex`, `breakpoint`.

## Installation

```sh
bun add @tokotuku/tokens
```

## Usage

```ts
import { spacing, brand, radius } from "@tokotuku/tokens";

spacing[4]; // "1rem"
brand[600]; // "#0060e6"
radius.lg;  // "0.5rem"
```

## Notes

- The `brand` color ramp is a **placeholder** — replace it with real brand colors before any public release.
- All token modules export `as const` objects plus a derived key union type (e.g. `SpacingToken`) for type-safe consumption in `@tokotuku/theme` and component prop types.
