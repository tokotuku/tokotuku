# @tokotuku/elements

Tokotuku UI's Web Components: `tk-*` custom elements built with Lit, Shadow DOM, and full accessibility support. No components exist yet — this package currently only carries the shared conventions every component must follow.

## Conventions

- **Tag prefix**: `tk-` (e.g. `<tk-button>`). Use `tagName("button")` from `./constants` rather than hardcoding the string.
- **Event prefix**: same as the tag (e.g. `tk-change`, `tk-open`, `tk-close`, `tk-select`). Always a typed `CustomEvent` via `@tokotuku/core`'s `TypedEvent<T>` — never an anonymous payload.
- **Decorators**: standard (stage 3) ECMAScript decorators, not `experimentalDecorators`. `configs/typescript/lib.json` already sets `useDefineForClassFields: true` to match. Use Lit's `@customElement`, `@property`, `@state`, `@query` from `lit/decorators.js`.
- **Styling**: CSS custom properties only, consumed from `@tokotuku/theme`'s `--tk-*` variables — never a hardcoded color, spacing, radius, or duration inside a component's own stylesheet.
- **sideEffects**: this package's `package.json` sets `"sideEffects": true`. Every component's module calls `customElements.define(...)` at import time — a real side effect. Marking it `false` would let bundlers tree-shake away registration for any component imported only for its side effect (the common case: `import "@tokotuku/elements/button"`).

## Per-component structure

Once the first component is built, it lives at `src/components/<name>/` with:

```
component.ts       Lit component class, extends LitElement
component.css       Component styles (CSS custom properties only)
component.test.ts   Vitest unit tests
component.spec.ts   Playwright interaction/accessibility tests
types.ts             Public prop/slot/part types
constants.ts         Tag name, defaults
events.ts             Typed CustomEvent classes for this component
controller.ts         Reactive controller, only if the component needs one
README.md             Overview / Installation / Usage / Properties / Methods /
                       Events / Slots / CSS Variables / CSS Parts / Accessibility /
                       Keyboard Support / Examples / Migration Notes
```

## Open decision before the first component

`component.css` is a **separate file** per the brief, rather than Lit's usual inline `css\`...\`` tagged template. That means the build needs a loader that turns `component.css` into a `CSSResult` (or a raw string fed to `unsafeCSS`) at bundle time. Resolve this — e.g. a small esbuild/tsup loader, or a `?inline` import convention — before scaffolding the first real component, so every component follows the same pattern from day one.
