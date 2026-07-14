# @tokotuku/cli

Developer CLI for Tokotuku UI.

## Installation

Requires Bun on `PATH` — the published binary's shebang is `#!/usr/bin/env bun`, matching the project's Bun-only runtime.

```sh
bun add -D @tokotuku/cli
```

## Commands

```sh
tokotuku create component <name>   # not yet implemented
tokotuku generate icon <name>      # not yet implemented
tokotuku generate docs             # not yet implemented
tokotuku generate playground       # not yet implemented
tokotuku generate changelog        # delegates to `bunx changeset version`
```

## Status

Only `generate changelog` does real work today — it shells out to Changesets, which is already the correct single source of truth for versioning and changelog generation, so there was nothing to build.

The other four commands print a "not implemented yet" message and exit non-zero. Each depends on a decision that hasn't been made yet:

- `create component` needs the `component.css` build strategy resolved first (see `packages/elements/README.md`) — otherwise the generated template bakes in a guess.
- `generate icon` needs the sprite-generation approach (see `packages/icons/README.md`).
- `generate docs` / `generate playground` need `apps/docs` and `apps/playground` to have a real page/story structure to scaffold against, beyond the empty shells created so far.
