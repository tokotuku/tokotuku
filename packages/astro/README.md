# @tokotuku/astro

Astro wrappers around `@tokotuku/elements` Web Components.

## Status

No wrapper components yet — `@tokotuku/elements` has no real components to wrap. This package currently only carries its dependency wiring and the open decisions below, so the first wrapper follows a settled convention instead of inventing one under time pressure.

## Rule

An `.astro` wrapper must never duplicate a component's business logic. It only:

1. Forwards props to the underlying `tk-*` element's attributes/properties.
2. Forwards named slots.
3. Optionally picks a sensible default Astro [client directive](https://docs.astro.build/en/reference/directives-reference/#client-directives) (e.g. `client:visible` for a carousel, nothing for a purely presentational element with no interactivity).

Any behavior beyond that belongs in `@tokotuku/elements`, not here.

## Open decisions before the first wrapper

- **Publish format**: ship raw `.astro` source (Astro's own compiler runs in the consuming app, so this is safe for `.astro` files) alongside **built** `.js`/`.d.ts` for any accompanying TS prop-type helpers — raw `.ts` in `node_modules` isn't reliably transpiled by every consumer's Vite config. Needs a small tsup config once a real helper module exists.
- **Prop mapping convention**: decide once whether boolean HTML-ish props (e.g. `disabled`) forward as attributes vs. properties, and document it centrally rather than re-deciding it per component.
