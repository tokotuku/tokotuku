# @takontuku/theme

Shared Takontuku design tokens, fonts, palette serialization, and theme bootstrap.

Import `@takontuku/theme/styles.css` once at the application boundary. The package
keeps the `--tk-*` variable contract stable while allowing consumers to override
light and dark palette values through `paletteStyle`.
