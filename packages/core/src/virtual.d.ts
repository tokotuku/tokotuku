declare module "virtual:tokotuku/registry" {
  const registry: import("./registry").ResolvedRegistry;
  export default registry;
}

declare module "virtual:tokotuku/admin-nav" {
  const adminNav: import("./module").AdminNavItem[];
  export default adminNav;
}

declare module "virtual:tokotuku/config" {
  const brand: import("./format").FormattersConfig & { name: string };
  export default brand;
}

declare module "virtual:tokotuku/ambient-scripts" {
  // biome-ignore lint/suspicious/noExplicitAny: re-exported .astro component factories, no single narrow shape fits every one
  const scripts: any[];
  export default scripts;
}
