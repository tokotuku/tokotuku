import "@takontuku/theme/styles.css";

if (typeof document !== "undefined") {
  document.documentElement.dataset.theme = "light";
}

export default {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: "error",
    },
  },
};
