declare module "virtual:karsa/registry" {
  const registry: import("./registry").ResolvedRegistry;
  export default registry;
}

declare module "virtual:karsa/admin-nav" {
  const adminNav: import("./module").AdminNavItem[];
  export default adminNav;
}

declare module "virtual:karsa/config" {
  const brand: import("./integration").KarsaBrand;
  export default brand;
}

declare module "virtual:karsa/ambient-scripts" {
  // biome-ignore lint/suspicious/noExplicitAny: re-exported .astro component factories, no single narrow shape fits every one
  const scripts: any[];
  export default scripts;
}

declare module "virtual:karsa/site-home-sections" {
  const sections: Array<
    import("./module").SiteHomeSection & {
      component: import("astro/runtime/server/index.js").AstroComponentFactory;
    }
  >;
  export default sections;
}

declare module "virtual:karsa/sitemap-sources" {
  const sources: Array<
    import("./module").SitemapSourceContribution & {
      module: {
        getSitemapEntries: (context: {
          request: Request;
          locals: App.Locals;
        }) => Promise<import("./module").SitemapEntry[]> | import("./module").SitemapEntry[];
      };
    }
  >;
  export default sources;
}

declare module "virtual:karsa/admin-dashboard-widgets" {
  const widgets: Array<
    import("./module").AdminDashboardWidget & {
      component: import("astro/runtime/server/index.js").AstroComponentFactory;
    }
  >;
  export default widgets;
}

declare module "virtual:karsa/auth-panel-widgets" {
  const widgets: Array<
    import("./module").AuthPanelWidget & {
      component: import("astro/runtime/server/index.js").AstroComponentFactory;
    }
  >;
  export default widgets;
}
