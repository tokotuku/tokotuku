# Tokotuku local registry

This Verdaccio instance is only for testing Tokotuku packages locally. It listens on
`127.0.0.1:4873`, allows anonymous publishing for `@tokotuku/*`, and proxies all other package
downloads to npmjs.org.

Verdaccio is registered as a Moon project. Start and stop it from the repository root:

```sh
moon run verdaccio:up
moon run verdaccio:logs
moon run verdaccio:down
```

Open `http://localhost:4873` to inspect published packages.

Configure both this repository and generated test projects with a project-local `.npmrc`:

```ini
@tokotuku:registry=http://localhost:4873/
```

Build Tokotuku, then publish the packages in dependency order:

```sh
moon run :build

(cd packages/core && bun publish --registry http://localhost:4873)
(cd packages/tokens && bun publish --registry http://localhost:4873)
(cd packages/theme && bun publish --registry http://localhost:4873)
(cd packages/elements && bun publish --registry http://localhost:4873)
(cd packages/astro && bun publish --registry http://localhost:4873)
```

A registry version is immutable. To reuse the same package versions, remove the local registry
volume and start again:

```sh
moon run verdaccio:reset
moon run verdaccio:up
```
