# Takontuku 0.2 migration

`0.2.0` is a breaking release. The `examples/` fixtures remain unchanged, but application imports
must move to the new public subpaths.

| Before | 0.2.0 |
| --- | --- |
| `@takontuku/ui/styles.css` | `@takontuku/theme/styles.css` |
| `@takontuku/ui/admin.css` | `@takontuku/theme/admin.css` |
| `@takontuku/ui/theme` | `@takontuku/theme/palette` |
| `@takontuku/ui/Chart.astro` | `@takontuku/charts/Chart.astro` |
| `@takontuku/ui/chart` | `@takontuku/charts/types` |
| `@takontuku/ui/Layout.astro` | `@takontuku/ui/DocumentLayout.astro` |
| `@takontuku/ui/AdminMetric.astro` | `@takontuku/ui/InspectorMetric.astro` |
| `@takontuku/core/routes/AdminLayout.astro` | `@takontuku/core/layouts/AdminLayout.astro` |
| `@takontuku/core/routes/StorefrontHome.astro` | `@takontuku/core/components/storefront/StorefrontHome.astro` |
| `import { authClient } from "@takontuku/auth"` | `import { authClient } from "@takontuku/auth/client"` |

Admin catalog, orders, and booking list helpers now return `CursorPage<T>` with 25-item route pages.
Use `?after=<cursor>` and `?before=<cursor>`; changing a filter invalidates the old cursor. The
numbered `Pagination.astro` component remains available for unrelated storefront lists.

Theme bootstrap is centralized in `ThemeScript.astro`. Do not add a second local-storage or
`prefers-color-scheme` bootstrap script, and import the theme stylesheet once at the document
boundary.
