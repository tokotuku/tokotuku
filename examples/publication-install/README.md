# Karsa Journal — install

Install-only publication fixture for Karsa. It wires the auth and content modules, collects
`karsa.migrations.json`, and leaves editorial data, theme overrides, and custom assets for the
content and polished tiers.

```sh
bun run cf-typegen
bun run db:sync
bun run db:migrate:local
bun run typecheck
bun run lint
bun run build
```
