declare module "virtual:tokotuku/registry" {
  const registry: import("./registry").ResolvedRegistry;
  export default registry;
}

declare module "virtual:tokotuku/admin-nav" {
  const adminNav: import("./module").AdminNavItem[];
  export default adminNav;
}

declare module "virtual:tokotuku/config" {
  const brand: import("./integration").TokotukuBrand;
  export default brand;
}

declare module "virtual:tokotuku/ambient-scripts" {
  // biome-ignore lint/suspicious/noExplicitAny: re-exported .astro component factories, no single narrow shape fits every one
  const scripts: any[];
  export default scripts;
}

declare module "virtual:tokotuku/storefront-home-sections" {
  const sections: Array<
    import("./module").StorefrontHomeSection & {
      component: import("astro/runtime/server/index.js").AstroComponentFactory;
    }
  >;
  export default sections;
}

declare module "virtual:tokotuku/admin-dashboard-widgets" {
  const widgets: Array<
    import("./module").AdminDashboardWidget & {
      component: import("astro/runtime/server/index.js").AstroComponentFactory;
    }
  >;
  export default widgets;
}
