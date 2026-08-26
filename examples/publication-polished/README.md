# Karsa Journal — polished

Polished publication fixture with a focused burnt-clay palette and one deterministic local hero
asset. Editorial routes and data remain owned by `@karsa/content`; the app only supplies the shell
and brand configuration.

```sh
bun run db:sync
bun run db:migrate:local
bun run db:seed
bun run typecheck
bun run lint
bun run build
```
