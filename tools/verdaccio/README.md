# Local Verdaccio registry

This registry now holds **only the private modules** (`@takontuku/catalog`, `@takontuku/orders`) —
`core`/`ui`/`auth`/`config`/`create-takontuku` are published to real public npm instead. It's still
used locally for development and by `tools/e2e-install/`'s gates, which publish throwaway
`0.0.0-e2e.<timestamp>` versions of every package (public ones included) to keep the whole
publish/install/update cycle testable without touching real npm.

Start the registry from the repository root:

```sh
docker compose -f tools/verdaccio/compose.yaml up -d
```

The registry and its web UI are available at <http://localhost:4873>.

## Self-registration is closed

`config.yaml` sets `max_users: -1`, so `npm adduser` against a fresh registry is rejected — add
every team account with the command below **before** that config is what's running (i.e. before
first bringing the registry up with it, or before restarting onto a config change that includes
it), since there's no way to self-register afterward. If you're locked out, edit
`/verdaccio/storage/htpasswd` inside the container directly instead.

```sh
npm adduser --registry http://localhost:4873
```

`npm adduser` writes the resulting auth token into `~/.npmrc` by default. This repo's own
`.npmrc` is gitignored, so add the token there instead by appending the line it prints
(`//localhost:4873/:_authToken=...`) — do not commit it.

`@takontuku/catalog` and `@takontuku/orders` require authentication just to **read** (`access:
$authenticated` in `config.yaml`), not just to publish — verify with `npm view
@takontuku/catalog --registry http://localhost:4873` from a machine with no token configured; it
should 401/403. The rest of the `@takontuku/*` scope stays `access: $all` for local dev
convenience, since it either doesn't exist here at all once published to real npm, or is meant to
be publicly installable anyway.

Map the scope explicitly in `.npmrc` so `bun install` / `bun publish` route it to Verdaccio
without passing `--registry` on every command:

```
@takontuku:registry=http://localhost:4873
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

## Exposing this beyond localhost

The registry binds to `127.0.0.1` only, on purpose — reachable from this machine alone. For a
team-wide private registry, put a Cloudflare Tunnel (`cloudflared`) in front of it rather than
opening the port; see the root plan/architecture notes for the exact compose service and the
tradeoffs of self-registration + anonymous read access once something is actually reachable from
the internet. Do not change the port binding or add `cloudflared` without also confirming
`max_users: -1` and the private-package `access: $authenticated` rules above are actually the
config the running container has loaded.
