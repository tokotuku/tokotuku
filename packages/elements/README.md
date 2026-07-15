# @tokotuku/elements

Tokotuku UI's Web Components: `tk-*` custom elements built with Lit, Shadow DOM, and full accessibility support.

## Conventions

- **Tag prefix**: `tk-` (e.g. `<tk-button>`). Use `tagName("button")` from `./constants` rather than hardcoding the string.
- **Event prefix**: same as the tag (e.g. `tk-change`, `tk-open`, `tk-close`, `tk-select`). Always a typed `CustomEvent` via `@tokotuku/core`'s `TypedEvent<T>` — never an anonymous payload.
- **Decorators**: **not used**, despite the stage-3 (standard) decorator support in `configs/typescript/lib.json` (`useDefineForClassFields: true`, no `experimentalDecorators`). As of this package's first components, Vite 8's default transform (Oxc/Rolldown) cannot parse *any* TC39 class/field decorator yet — confirmed by testing under Vitest, which uses that pipeline — so `@customElement`/`@property`/`@state`/`@query` from `lit/decorators.js` currently break tests. Use Lit's non-decorator APIs instead: a `static properties = {...}` field for reactive properties (each backed by a `declare foo: T;` field — no initializer, so TS doesn't emit a shadowing own-property over Lit's generated accessor — with defaults assigned in the constructor after `super()`), and an explicit `customElements.define(tagName("x"), TkX)` call after the class body instead of `@customElement`. Revisit once Oxc supports decorators.
- **Styling**: CSS custom properties only, consumed from `@tokotuku/theme`'s `--tk-*` variables — never a hardcoded color, spacing, radius, or duration inside a component's own stylesheet.
- **sideEffects**: this package's `package.json` sets `"sideEffects": true`. Every component's module calls `customElements.define(...)` at import time — a real side effect. Marking it `false` would let bundlers tree-shake away registration for any component imported only for its side effect (the common case: `import "@tokotuku/elements/button"`).

## Per-component structure

Each component lives at `src/components/<name>/` with:

```
component.ts       Lit component class, extends LitElement
component.css       Component styles (CSS custom properties only)
component.test.ts   Vitest unit tests
types.ts             Public prop/slot/part types
events.ts             Typed CustomEvent classes, only if the component dispatches any
controller.ts         Reactive controller, only if the component needs one
```

`component.spec.ts` (Playwright interaction/accessibility tests) and a per-component `README.md` are part of the intended structure but not yet added for `button`/`input`/`card` — scoped out of their first pass, add when needed.

## `component.css` loading

A separate `component.css` file (rather than Lit's inline `css\`...\`` tagged template) is imported as `import styles from "./component.css?raw"` and attached via `static override styles = unsafeCSS(styles)`. Vite/Vitest support the `?raw` suffix natively. For the `tsup` library build, `packages/elements/tsup.config.ts` sets `loader: { ".css": "text" }` — tsup's built-in CSS handling (esbuild's postcss plugin) then emits the file's raw text as a JS string default export instead of extracting a separate stylesheet.
