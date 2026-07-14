import type { Options } from "tsup";

export function createTsupConfig(overrides: Options = {}): Options {
  return {
    entry: ["src/index.ts"],
    format: ["esm"],
    target: "es2022",
    platform: "browser",
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    splitting: false,
    minify: false,
    ...overrides,
  };
}
