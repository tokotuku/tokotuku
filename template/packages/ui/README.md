# Starter application UI

Product-facing Astro components for the Tokotuku starter. This package owns application
composition; accessible, reusable primitives remain versioned in `@tokotuku/elements` and
`@tokotuku/astro`.

## Included surfaces

- app shell, sidebar, top bar, and page header;
- public store header and commerce product cards;
- buttons, inputs, cards, alerts, badges, skeletons, and empty states;
- stat cards, data tables, tabs, and pagination;
- accessible charts compiled by Flint Chart and rendered by modular ECharts with SVG.

Components are exported individually so an application only imports the surfaces it uses.

## Chart example

```astro
---
import Chart from "@tokotuku-starter/ui/Chart.astro";
import type { ChartInput } from "@tokotuku-starter/ui/chart";

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

The chart component follows the active Tokotuku theme, respects reduced-motion preferences,
enables ECharts ARIA decals, and renders a collapsible data table as an accessible fallback.
Selections bubble as a `chart-select` custom event from the chart root.

The client runtime registers bar, line, pie, scatter, and heatmap series. Add another ECharts
series or component in `src/charts/client.ts` only when a product screen needs it, preserving
the modular bundle.
