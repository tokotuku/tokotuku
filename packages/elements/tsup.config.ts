import { createTsupConfig } from "@tokotuku/config/tsup";

export default createTsupConfig({
  entry: {
    index: "src/index.ts",
    button: "src/components/button/component.ts",
    input: "src/components/input/component.ts",
    card: "src/components/card/component.ts",
  },
  // tsup's built-in CSS handling (esbuild's postcss plugin under the hood) reads a
  // `.css` file's raw text and, when told to load `.css` with the "text" loader,
  // emits it as a plain JS string default export — exactly what `unsafeCSS()` wants.
  // No custom esbuild plugin needed; this is the documented tsup `loader` option.
  loader: {
    ".css": "text",
  },
});
