import { defineModule, type ModuleDefinition } from "@takontuku/core";

export function jarene(): ModuleDefinition {
  return defineModule({
    name: "jarene",
    authPanelWidgets: [
      {
        id: "jarene-quote",
        entrypoint: "@takontuku/jarene/components/JareneAuthQuote.astro",
        order: 10,
      },
    ],
  });
}

export { type JareneQuote, jareneQuotes, pickJareneQuote } from "./quotes";
