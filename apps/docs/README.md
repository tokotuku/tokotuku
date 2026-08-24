# Karsa documentation

The Karsa documentation site uses Astro and Starlight. Every guide is available under both
`/en/` and `/id/`; `/` redirects to `/en/`.

## Development

```sh
bun run dev
bun run parity
bun run typecheck
bun run build
```

The parity check fails when a page exists in only one locale. Keep the relative path and
frontmatter shape paired when adding a guide, then translate its title, description, sidebar
label, examples, and links. Core guidance is site-neutral; product, service, or other domain
terms belong in the guide that explains that domain.
