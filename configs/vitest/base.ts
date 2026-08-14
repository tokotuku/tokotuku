import { defineConfig, mergeConfig, type ViteUserConfig as UserConfig } from "vitest/config";

const baseConfig: UserConfig = {
  test: {
    environment: "happy-dom",
    globals: false,
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
};

export function createVitestConfig(overrides: UserConfig = {}): UserConfig {
  return mergeConfig(defineConfig(baseConfig), defineConfig(overrides));
}
