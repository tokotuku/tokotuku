# @tokotuku/astro

Astro wrappers around `@tokotuku/elements` Web Components.

## Rule

An `.astro` wrapper must never duplicate a component's business logic. It only:

1. Forwards props to the underlying `tk-*` element's attributes/properties.
2. Forwards named slots.
3. Registers the element's client-side module via an inline `<script>` in the
   template body (e.g. `import "@tokotuku/elements/button";`) — **never** a
   frontmatter import. Frontmatter runs server-side during SSR, where
   `customElements`/`HTMLElement` don't exist; a template `<script>` is what
   Astro actually bundles and executes in the browser. Astro dedupes identical
   inline scripts per page, so using a wrapper multiple times still only ships
   the registration once.

Any behavior beyond that belongs in `@tokotuku/elements`, not here.

## Conventions

- **Publish format**: raw `.astro` source, re-exported directly via `package.json` `exports` (e.g. `./TkButton.astro` → `./src/components/TkButton.astro`) — no build step. Astro's own compiler runs in the consuming app. Accompanying TS prop-type helpers (`src/types.ts`) are plain `.ts`, also shipped as source (also gives the package's `tsc` typecheck task real input files to check).
- **Boolean prop forwarding**: never pass a bare `false` for a boolean attribute on a `tk-*` element — Astro's compiler doesn't reliably omit `false`-valued attributes for custom (non-standard) elements the way it does for native HTML elements; it can render `disabled={false}` as the *present* attribute `disabled=""`, which Lit's `Boolean` property converter then reads as `true` (any attribute presence, regardless of value, means true — standard HTML boolean-attribute semantics). Use `disabled={disabled ? true : undefined}` instead — `true` renders as a bare attribute, `undefined` is always fully omitted, both unambiguous regardless of element type.
