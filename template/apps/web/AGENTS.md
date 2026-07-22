## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Design System

Reusable UI (buttons, cards, layout shells, data display, charts, etc.) lives in `packages/ui`
(`@tokotuku-starter/ui`), not in this app. Build or change a component there first and verify it
visually in Storybook (`bun run storybook` in `apps/storybook`) before wiring it into a page here.

Only add components under this app's `src/components` when they are page-specific compositions or
business logic (e.g. `ProductForm`, `AdminLayout`) that assemble primitives from
`@tokotuku-starter/ui` rather than being reusable UI on their own.

## Building a page from a design mockup

When a page is built or updated from a reference mockup image (e.g. an AI-generated homepage
design), keep the mockup and the page in sync explicitly instead of eyeballing it once:

- Save the mockup itself under this app's `design/` folder (e.g. `design/home.png`) so it stays
  available as a reference across sessions instead of only existing in chat.
- Any non-product decorative visual in the mockup (hero illustration, background pattern, icon
  set, etc.) is an asset to be AI-generated separately — do not approximate it with CSS gradients,
  stock icon fonts, or placeholder boxes. Flag which assets are still missing rather than faking
  them.
- Generated assets go in `packages/ui/src/assets/images/` if reusable across pages, or this app's
  `src/assets/images/` if page-specific — imported via Astro's `<Image />`, not dropped into
  `public/` unprocessed.
- Record the prompt used for each generated asset in a manifest next to the assets (filename →
  prompt → model), so it can be regenerated or tweaked later without guessing the original prompt.
- Product photos are unrelated to this flow — those go through the existing `PRODUCT_IMAGES` R2
  bucket, not this asset pipeline.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
