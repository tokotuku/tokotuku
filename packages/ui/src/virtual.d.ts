// Layout.astro renders whatever `@tokotuku/core`'s Vite plugin puts on this
// virtual module (each installed module's ambient scripts, e.g. orders'
// cart wiring) — declared locally rather than imported from
// `@tokotuku/core` so `ui` doesn't depend on the package that already
// depends on `ui`, which would make them a circular package pair.
declare module "virtual:tokotuku/ambient-scripts" {
  // biome-ignore lint/suspicious/noExplicitAny: re-exported .astro component factories, no single narrow shape fits every one
  const scripts: any[];
  export default scripts;
}
