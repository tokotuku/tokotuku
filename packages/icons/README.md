# @tokotuku/icons

Tree-shakeable SVG icon set for Tokotuku UI.

## Overview

Every icon is a raw SVG markup string, `viewBox="0 0 24 24"`, `stroke="currentColor"` so it inherits color from CSS rather than a hardcoded fill. Icons are framework-agnostic — `@tokotuku/elements`'s `<tk-icon>` component (not yet built) will consume them via `unsafeSVG`/`innerHTML`.

## Installation

```sh
bun add @tokotuku/icons
```

## Usage

```ts
// Full set
import { closeIcon } from "@tokotuku/icons";

// Individual icon — only this file is bundled
import { closeIcon } from "@tokotuku/icons/close";
```

## Adding an icon

1. Add `src/icons/<name>.ts` exporting a single `<svg>` string, `viewBox="0 0 24 24"`, `stroke="currentColor"`.
2. Re-export it from `src/index.ts`.
3. No `package.json` changes needed — the `./icons/*` export is a wildcard that resolves any file under `dist/icons/`.

## Trade-offs / future work

- **Sprite generation** (listed in the brief) is not implemented yet. It belongs alongside `@tokotuku/cli`'s planned `generate icon` command, which is the natural place to regenerate a sprite sheet whenever an icon is added — building a sprite pipeline before that command exists would be speculative.
- Only two placeholder icons exist (`close`, `chevron-down`) to prove the individual-import and tree-shaking setup works end-to-end.
