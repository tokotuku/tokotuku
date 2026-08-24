---
"@karsa/core": minor
"create-karsa": minor
---

Ship Agent Skills so AI coding agents know how to build with Karsa.

`@karsa/core` now bundles five skills under `skills/`, following the Agent Skills
open standard (https://agentskills.io): `karsa-site-builder` (preset and tier selection),
`karsa-modules` (adding and removing features, module dependencies, writing code that works
whether or not a module is installed), `karsa-data` (append-only migrations, D1/R2 bindings,
seeding, secrets), `karsa-content` (safe Markdown posts and publication routes), and
`karsa-ui` (the packaged components, brand config, theme tokens, locale-aware formatters).

They cover the rules that are expensive to get wrong and invisible from reading the code:
that `karsa add` owns three files at once and hand-editing them leaves a site
half-installed, that applied migrations are never rewritten, that `MEDIA` is deliberately
not named `IMAGES`, that a statically imported module breaks a site that doesn't have it,
and that seed data is not the same thing as demo data.

New command `karsa skills install` copies them into `.agents/skills/` (read by Copilot
and Cursor) and `.claude/skills/` (read by Claude Code) — the spec defines the format but
leaves discovery to each agent, so both are written from one source. `create-karsa`
runs it during setup, so a fresh site has them already. Re-run it after upgrading
`@karsa/core` to pick up changes.

The skills are validated against the specification by a unit test in `@karsa/core`
rather than an external tool: agent tooling silently ignores a skill it cannot parse, so a
malformed one would otherwise ship unnoticed.
