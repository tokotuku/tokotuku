# Karsa Journal — content

Content-tier publication fixture. The `@karsa/content` module owns posts, the public journal,
authenticated draft preview, publishing/archive state, RSS, and sitemap contributions. Local seed
data is idempotent and contains one published, one draft, and one archived post.

```sh
bun run db:sync
bun run db:migrate:local
bun run db:seed
bun run typecheck
bun run lint
bun run build
```
