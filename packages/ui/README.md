# Starter application UI

The Astro component primitives and application surfaces for the Karsa starter live in this
package. Theme tokens and chart runtime are opt-in sibling packages.

Import `@karsa/theme/styles.css` once in the application layout. It provides Tailwind,
semantic theme utilities, and light/dark color modes with OS accessibility support.

## Included surfaces

- app shell, sidebar, top bar, and page header;
- public site header and commerce product cards;
- buttons, inputs, cards, alerts, badges, skeletons, and empty states;
- stat cards, data tables, tabs, and pagination;
- accessible charts compiled by Flint Chart and rendered by modular ECharts with SVG.

Components are exported individually so an application only imports the surfaces it uses.

## Chart example

```astro
---
import Chart from "@karsa/charts/Chart.astro";
import type { ChartInput } from "@karsa/charts/types";

const input: ChartInput = {
  data: { values: [{ product: "Widget", revenue: 1200 }] },
  semantic_types: { product: "Category", revenue: "Price" },
  chart_spec: {
    chartType: "Bar Chart",
    encodings: { x: "product", y: "revenue" },
  },
};
---

<Chart input={input} title="Revenue by product" />
```

The chart component follows the active Karsa theme, respects reduced-motion preferences,
enables ECharts ARIA decals, and renders a collapsible data table as an accessible fallback.
Selections bubble as a `chart-select` custom event from the chart root.

The client runtime registers bar, line, pie, scatter, and heatmap series. It is loaded only when a
chart is within 200px of the viewport. Add another ECharts series or component in
`@karsa/charts` only when a product screen needs it, preserving the deferred bundle.
