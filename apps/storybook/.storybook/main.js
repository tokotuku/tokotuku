import { alpinejs } from "@storybook-astro/framework/integrations";
import tailwindcss from "@tailwindcss/vite";

export default {
  stories: ["../src/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: ["@storybook/addon-a11y"],
  framework: {
    name: "@storybook-astro/framework",
    options: {
      integrations: [alpinejs()],
    },
  },
  viteFinal(config) {
    config.plugins ??= [];
    config.plugins.push(tailwindcss());
    // Storybook's preview runtime and accessibility tooling share a vendor chunk;
    // keep the warning aligned with the repository's gzip performance budget.
    config.build ??= {};
    config.build.chunkSizeWarningLimit = 900;
    return config;
  },
};
