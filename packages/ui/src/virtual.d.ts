// DocumentLayout.astro renders whatever `@takontuku/core`'s Vite plugin puts on this
// virtual module (each installed module's ambient scripts, e.g. orders'
// cart wiring) — declared locally rather than imported from
// `@takontuku/core` so `ui` doesn't depend on the package that already
// depends on `ui`, which would make them a circular package pair.
declare module "virtual:takontuku/ambient-scripts" {
  // biome-ignore lint/suspicious/noExplicitAny: re-exported .astro component factories, no single narrow shape fits every one
  const scripts: any[];
  export default scripts;
}
