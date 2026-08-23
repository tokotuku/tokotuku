---
name: takontuku-ui
description: Build and style pages in a Takontuku store using the packaged Astro components, brand configuration, theme tokens, and locale-aware formatters. Use when creating or editing a page or layout, when choosing a component, when changing colors, logo, or store copy, or when formatting money and dates.
license: MIT
metadata:
  package: "@takontuku/core"
---

# Takontuku UI

`@takontuku/ui` ships ready-made Astro components. They render semantic HTML and static
Tailwind CSS with no client JavaScript, so prefer them over hand-rolled markup — a custom
button will not pick up theme tokens, dark mode, or forced-colors accessibility handling.

## Importing

Each component is its own export. Load the stylesheet once, in the layout:

```astro
---
import Layout from "@takontuku/ui/Layout.astro";
import Button from "@takontuku/ui/Button.astro";
import "@takontuku/ui/styles.css";
---
```

Available: `Alert`, `AppShell`, `AppSidebar`, `AppTopbar`, `Badge`, `Button`, `Card`,
`Chart`, `DashboardMetric`, `DataTable`, `EmptyState`, `Icon`, `Input`, `Layout`,
`PageHeader`, `Pagination`, `ProductCard`, `SEO`, `Skeleton`, `StatCard`, `StoreFooter`,
`StoreHeader`, `StorefrontEmptyCollection`, `StorefrontHero`, `Tabs`. Admin surfaces also
have `@takontuku/ui/admin.css`.

## Never format money or dates by hand

`@takontuku/core` exports formatters already bound to the store's locale, currency, and
time zone. Hand-formatting produces the wrong result the moment a store is not the
default `id-ID` / `IDR`:

```astro
---
import { brand, money, date } from "@takontuku/core";
---
<p>{money(product.priceCents)}</p>
<p>{date(order.createdAt)}</p>
<h1>{brand.name}</h1>
```

## Brand configuration

Everything store-identity lives in `astro.config.mjs`, in the `takontuku({ brand })`
block — not scattered through components:

```js
takontuku({
  brand: {
    name: "Pawfect",
    locale: "id-ID",
    currency: "IDR",
    timeZone: "Asia/Jakarta",
    logo: { src: "/logo.svg", alt: "Pawfect" },
    palette: {
      light: { accent: "#7c3aed", accentForeground: "#ffffff" },
      dark: { accent: "#a78bfa", accentForeground: "#1e1b4b" },
    },
    storefront: {
      announcement: "Free delivery over 500k",
      hero: { eyebrow: "New", title: "…", description: "…", image: "/hero.webp" },
      links: [{ label: "About", href: "/about" }],
    },
    auth: { backgroundImage: "/images/auth.webp", backgroundPosition: "center" },
    messages: { "catalog.storefront.emptyTitle": "Coming soon" },
  },
  modules: [auth()],
})
```

`messages` takes sparse overrides of the packaged dictionaries — use it to reword
built-in copy instead of forking a component. The same config is readable at runtime as
`virtual:takontuku/config`. Without `brand.auth.backgroundImage`, `@takontuku/auth` uses
its package-owned ivory-and-teak editorial fallback. The optional `@takontuku/jarene` module adds a
server-rendered quote to that visual panel and can be removed with `bunx takontuku remove jarene`.

## Theming

Colors come from Tailwind v4 theme variables plus semantic `--tk-*` custom properties.
`data-theme="light" | "dark"` on the root element selects a palette; with no attribute the
inline bootstrap follows `prefers-color-scheme` and remembers a choice in `localStorage`.

Override tokens with ordinary CSS scoped wherever you need — they cascade through the
rendered HTML:

```css
.checkout-actions {
  --tk-color-accent: #7c3aed;
  --tk-color-accent-fg: #ffffff;
  --tk-radius-md: 999px;
}
```

Reach for `brand.palette` for a store-wide accent, and `--tk-*` overrides for one
surface. Avoid hard-coded hex values in components: they break dark mode and
forced-colors.

## Module-contributed surfaces

The commerce storefront home page, admin dashboard, and optional auth visual panel are assembled
from module contributions, not from a page you edit. Modules add sections and widgets through
`virtual:takontuku/storefront-home-sections` and
`virtual:takontuku/admin-dashboard-widgets`, with `virtual:takontuku/admin-nav` for
navigation. Auth-panel contributions use `virtual:takontuku/auth-panel-widgets`.

For a company-profile app with no commerce module, app-owned static pages and sections are allowed;
compose them from packaged UI components and semantic tokens. For product or service commerce,
do not copy or fork module-owned catalog, cart, checkout, booking, or admin pages. Use a focused
`src/theme/` override only when the requested maturity level is polished.
