import { defineModule, type ModuleDefinition } from "@karsa/core";

export function jarene(): ModuleDefinition {
  return defineModule({
    name: "jarene",
    authPanelWidgets: [
      {
        id: "jarene-quote",
        entrypoint: "@karsa/jarene/components/JareneAuthQuote.astro",
        order: 10,
      },
    ],
  });
}

export { type JareneQuote, jareneQuotes, pickJareneQuote } from "./quotes";
