# 0.2.0 performance gates

The package-level gates are intentionally payload-focused because this repository does not contain
a representative deployed application. Run them after a workspace install and before publishing:

```sh
bun run check:performance
bun run check:assets
```

`check:performance` bundles each client entry with its package dependencies and measures gzip size:

| Entry | Budget |
| --- | ---: |
| `@takontuku/auth` root | 5 KB |
| `@takontuku/auth/client` | 15 KB |
| `@takontuku/orders` cart client | 2 KB |
| Deferred `@takontuku/charts` runtime | 300 KB |

The chart runtime is not part of the initial chunk for routes without a chart; its budget covers the
deferred ECharts/Flint payload. Auth fallback images, dashboard artwork, and the SVG brand mark are
checked separately by the asset gate.
