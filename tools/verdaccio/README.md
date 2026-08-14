# Local Verdaccio registry

Start the registry from the repository root:

```sh
docker compose -f tools/verdaccio/compose.yaml up -d
```

The registry and its web UI are available at <http://localhost:4873>.

Create a local user before publishing:

```sh
npm adduser --registry http://localhost:4873
```

`npm adduser` writes the resulting auth token into `~/.npmrc` by default. This repo's own
`.npmrc` is gitignored, so add the token there instead by appending the line it prints
(`//localhost:4873/:_authToken=...`) — do not commit it.

The `@tokotuku/*` scope has no `npmjs` proxy configured (see `config.yaml`), so it never falls
through to the public registry. Map the scope explicitly in `.npmrc` so `bun install` / `bun
publish` route it to Verdaccio without passing `--registry` on every command:

```
@tokotuku:registry=http://localhost:4873
//localhost:4873/:_authToken=<token from npm adduser>
```

Publish a package to the local registry:

```sh
bun publish --registry http://localhost:4873
```

Stop the registry without deleting its package data:

```sh
docker compose -f tools/verdaccio/compose.yaml down
```

To delete the persistent package data as well, append `--volumes` to the
`down` command.
