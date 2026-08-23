# @takontuku/charts

Deferred ECharts/Astro chart rendering for Takontuku. Import the component from
`@takontuku/charts/Chart.astro` and the input type from `@takontuku/charts/types`.

The runtime is loaded when a chart is within 200px of the viewport, so routes that
do not render a chart do not pay the ECharts cost in their initial client chunk.
