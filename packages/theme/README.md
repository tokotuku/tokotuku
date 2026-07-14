# @tokotuku/theme

Light, dark, and high-contrast themes for Tokotuku UI, expressed as CSS custom properties built from `@tokotuku/tokens`.

## Overview

Every component reads color, and only color, through `--tk-*` CSS custom properties (e.g. `--tk-color-bg`, `--tk-color-accent`, `--tk-color-focus-ring`) — never a raw token or hex value. This package is the only place those variables are defined.

Themes select via `[data-theme="light|dark|high-contrast"]` on any ancestor element (typically `<html>`), and fall back to `prefers-color-scheme: dark` when no `data-theme` is set.

## Installation

```sh
bun add @tokotuku/theme
```

## Usage

```ts
import { themeCss } from "@tokotuku/theme";

const sheet = new CSSStyleSheet();
sheet.replaceSync(themeCss);
document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
```

Or consume the palettes programmatically (e.g. to render a theme picker):

```ts
import { light, dark, highContrast } from "@tokotuku/theme";
```

## Trade-offs / future work

- Themes currently ship as JS-exported CSS strings, not static `.css` files. This keeps a single source of truth (tokens → theme mapping in TypeScript) without a separate codegen build step. Once `@tokotuku/elements` needs a `<link>`-able stylesheet (e.g. for non-JS/SSR consumers), add a build step that writes `themeCss` to `dist/theme.css` via tsup's `publicDir`/`onSuccess` hook.
- No custom-theme authoring API yet (the brief calls for "custom themes") — revisit once `@tokotuku/elements` defines which CSS variables are actually load-bearing for components.
