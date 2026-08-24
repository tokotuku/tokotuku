---
name: karsa-content
description: Use when authoring or reviewing Karsa content, blog entries, publication pages, editorial metadata, or locale-paired content. Keep content owned by the content layer, accessible, and evidence-backed.
license: MIT
metadata:
  package: "@karsa/core"
---

# Karsa content

Use the content layer for articles, notes, documentation, authors, tags, feeds, and other
editorial entries. Keep the application responsible for the shell, navigation, landing pages,
and reading layout; do not force publication data into a transactional module or duplicate it in
app-owned page files.

## Authoring contract

- Inspect the content loader, collection schema, locale configuration, and existing entries first.
- Keep slugs stable and metadata explicit: title, description, date, author, tags, draft state,
  canonical URL, and social image when the collection requires them.
- Use one H1, ordered headings, meaningful links, alt text, and semantic lists in every entry.
- Keep locale pairs at the same relative path and translate frontmatter, headings, UI labels, and
  alt text rather than copying a source-language placeholder.
- Do not invent authors, dates, quotes, metrics, or publication claims to make an empty collection
  look complete.

## Ownership and workflow

Publication entries and editorial metadata belong in the content layer. App-owned Astro pages may
compose the shell and editorial landing pages; module-owned routes remain in their modules. Before
editing, inspect `astro.config.mjs`, content schemas, `src/content/`, `src/pages/`, the registry,
and media ownership.

For a content change, report the entry paths, locale pairs, schema assumptions, image/media keys,
draft behavior, canonical links, and the owner of each route. Use the narrowest content and tier
scope authorized by the brief; do not add a CMS, search index, or localization abstraction without
permission.

## Validation

Run the locale parity and content checks, then the relevant typecheck, lint, and build. Check the
rendered page for heading order, links, keyboard focus, reduced motion, responsive reading measure,
metadata, and truthful zero states. Report missing editorial input as under-engineering rather than
fabricating content, and record any deliberately deferred abstraction as over-engineering avoided.
