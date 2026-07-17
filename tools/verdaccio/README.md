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
