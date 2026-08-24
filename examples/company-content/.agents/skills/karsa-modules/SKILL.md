---
name: karsa-modules
description: Use when selecting, adding, removing, or integrating Karsa modules, when registry contributions or middleware are missing, or when code must work with an optional module installed or absent.
license: MIT
metadata:
  package: "@karsa/core"
---

# Karsa modules

Modules are optional packages. Each module owns the routes, navigation, widgets, data, and middleware registration that it contributes. The host app consumes the resolved registry; it should not recreate module behavior in `src/pages/`.

## Use the CLI as the wiring owner

```sh
bunx karsa add <module>
bunx karsa remove <module>
bunx karsa add <module> --no-install --no-sync
```

The CLI updates the package dependency, `astro.config.mjs` module list, and a package's `./register` side-effect import in `src/middleware.ts`. Never hand-edit one of those pieces to simulate an install. After a graph change, run `bunx karsa db sync`, review the migration diff, and apply local migrations.

## Dependency and ownership rules

`requires` is the module dependency graph. Missing or circular dependencies are configuration errors. Dependency order is stable and precedes presentation `order` when contributions are merged.

- A module owns its `siteRoutes`, `adminRoutes`, guarded prefixes, `adminNav`, `siteHomeSections`, widgets, migrations, seeds, and media prefixes.
- An app may own static pages that have no module owner.
- A service site connects external availability or payment through a narrow adapter at the service module boundary.
- A company site uses app-owned Astro pages; a publication uses the content layer. Neither needs a domain module merely to render a page.

## Registry contract

Use the typed definition and stable IDs:

```ts
import { defineModule } from "@karsa/core";

export default defineModule({
  name: "notes",
  requires: [],
  siteRoutes: [{ pattern: "/notes", entrypoint: "@karsa/notes/routes/index.astro" }],
  siteHomeSections: [{ id: "notes", entrypoint: "@karsa/notes/Notes.astro", order: 40 }],
});
```

Contribution IDs are unique within their type. Do not use a second registry or hidden global state. Optional behavior reads a virtual module:

```ts
import registry from "virtual:karsa/registry";

const hasNotes = registry.moduleNames.includes("notes");
```

Other contracts include `virtual:karsa/config`, `virtual:karsa/admin-nav`, `virtual:karsa/site-home-sections`, `virtual:karsa/admin-dashboard-widgets`, and `virtual:karsa/auth-panel-widgets`.

## Install/remove validation

Before changing code, inspect `astro.config.mjs`, `package.json`, `src/middleware.ts`, and the current registry. Afterward verify routes, nav, widgets, migrations, seeds, media prefixes, and optional imports. Remove the module and confirm all of its owned surfaces disappear while unrelated app pages still build.
