# @karsa/charts

Deferred ECharts/Astro chart rendering for Karsa. Import the component from
`@karsa/charts/Chart.astro` and the input type from `@karsa/charts/types`.

The runtime is loaded when a chart is within 200px of the viewport, so routes that
do not render a chart do not pay the ECharts cost in their initial client chunk.
