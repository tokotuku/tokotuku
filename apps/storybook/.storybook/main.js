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
    return config;
  },
};
