declare module "virtual:takontuku/registry" {
  const registry: import("./registry").ResolvedRegistry;
  export default registry;
}

declare module "virtual:takontuku/admin-nav" {
  const adminNav: import("./module").AdminNavItem[];
  export default adminNav;
}

declare module "virtual:takontuku/config" {
  const brand: import("./integration").TakontukuBrand;
  export default brand;
}

declare module "virtual:takontuku/ambient-scripts" {
  // biome-ignore lint/suspicious/noExplicitAny: re-exported .astro component factories, no single narrow shape fits every one
  const scripts: any[];
  export default scripts;
}

declare module "virtual:takontuku/storefront-home-sections" {
  const sections: Array<
    import("./module").StorefrontHomeSection & {
      component: import("astro/runtime/server/index.js").AstroComponentFactory;
    }
  >;
  export default sections;
}

declare module "virtual:takontuku/admin-dashboard-widgets" {
  const widgets: Array<
    import("./module").AdminDashboardWidget & {
      component: import("astro/runtime/server/index.js").AstroComponentFactory;
    }
  >;
  export default widgets;
}
