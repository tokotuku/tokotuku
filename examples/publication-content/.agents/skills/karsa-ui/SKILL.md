---
name: karsa-ui
description: Use when creating or editing a Karsa page, layout, component, theme, brand configuration, or locale-aware display. Prefer packaged Astro UI, semantic --karsa-* tokens, and native accessibility behavior.
license: MIT
metadata:
  package: "@karsa/core"
---

# Karsa UI

`@karsa/ui` provides typed Astro components that render semantic HTML and static CSS. Prefer the package before writing custom markup; a custom control can lose theme, focus, forced-colors, and reduced-motion behavior.

## Imports and roles

```astro
---
import DocumentLayout from "@karsa/ui/DocumentLayout.astro";
import Button from "@karsa/ui/Button.astro";
import "@karsa/theme/styles.css";
---
```

Core surfaces include `Alert`, `AppShell`, `AppSidebar`, `AppTopbar`, `Badge`, `Button`, `Card`, `DataTable`, `DocumentLayout`, `EmptyState`, `Input`, `PageHeader`, `Pagination`, `Skeleton`, `Tabs`, and the site header/hero components. Charts are opt-in from `@karsa/charts/Chart.astro`.

Load the stylesheet once at the document boundary. Use `@karsa/theme/admin.css` only in an admin layout.

## Brand and formatting

Keep name, logo, locale, currency, time zone, copy, and palette in the `brand` block passed to `karsa()`:

```js
import { karsa } from "@karsa/core";

karsa({
  brand: {
    name: "Northwind",
    locale: "en-US",
    currency: "USD",
    timeZone: "America/New_York",
    palette: { light: { accent: "#3659d6", accentForeground: "#ffffff" } },
  },
  modules: [],
});
```

Use `money()` and `date()` from `@karsa/core` for values that depend on locale, currency, or time zone. Do not concatenate a currency symbol or format a date by hand.

## Semantic tokens

The theme exposes `--karsa-*` variables. Reach for `--karsa-color-bg`, `--karsa-color-surface`, `--karsa-color-fg`, `--karsa-color-border`, `--karsa-color-accent`, `--karsa-color-focus-ring`, and semantic status colors. Scope a token override to the surface that needs it; use `brand.palette` for a site-wide change. Avoid raw hex values in reusable components.

```css
.notice {
  --karsa-color-accent: #3659d6;
  --karsa-color-accent-fg: #ffffff;
}
```

Respect `data-theme="light" | "dark"`, system preference, forced-colors, high contrast, and reduced motion. Native labels, headings, buttons, links, and form constraints are part of the component contract.

## Ownership

Module-contributed site sections, admin widgets, and auth-panel widgets arrive through Karsa virtual contribution modules. Do not copy module-owned routes into an app page. Company pages may be app-owned; product/order and service/booking domain pages stay with their modules. Keep publication articles in the content layer.
