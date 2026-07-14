import { themeCss } from "@tokotuku/theme";

const sheet = new CSSStyleSheet();
sheet.replaceSync(themeCss);
document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];

const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  app.innerHTML = `
    <h1 style="color: var(--tk-color-fg); background: var(--tk-color-bg); padding: 2rem;">
      Tokotuku UI Playground
    </h1>
    <p style="color: var(--tk-color-fg-muted); padding: 0 2rem;">
      No components registered yet — this page proves the workspace wiring (theme + build pipeline) works end to end.
    </p>
  `;
}
