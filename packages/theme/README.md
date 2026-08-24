# @karsa/theme

Shared Karsa design tokens, fonts, palette serialization, and theme bootstrap.

Import `@karsa/theme/styles.css` once at the application boundary. The package
keeps the `--karsa-*` variable contract stable while allowing consumers to override
light and dark palette values through `paletteStyle`.
