# Karsa 0.3 migration from Takontuku/Tokotuku 0.2

Karsa 0.3 is a deliberate breaking cutover. There are no package aliases, forwarded events,
dual CSS variables, storage fallbacks, or automatic codemod.

1. Create a backup or migration branch.
2. Rename `@takontuku/*` or `@tokotuku/*` packages and imports to `@karsa/*`.
3. Rename `create-takontuku`/`create-tokotuku` to `create-karsa`, the CLI and integration
   function to `karsa`, and `virtual:takontuku/*`/`virtual:tokotuku/*` to `virtual:karsa/*`.
4. Rename `takontuku.migrations.json` or `tokotuku.migrations.json` to
   `karsa.migrations.json` **before** running the new CLI. Preserve every logical module name,
   migration name, and sequence so applied migrations are not replayed.
5. Change `brand.storefront` to `brand.site`, `--tk-*` to `--karsa-*`,
   `takontuku-theme`/`tokotuku-theme` to `karsa-theme`, and `takontuku:*`/`tokotuku:*`
   DOM events and storage keys to `karsa:*`/`karsa-theme`.
6. Rename `storefrontRoutes` to `siteRoutes`, `storefrontHomeSections` to
   `siteHomeSections`, and import `SiteHome` from
   `@karsa/core/components/site/SiteHome.astro`.
7. Configure every module explicitly: `auth({ registration: "public" | "closed" })`,
   `catalog({ presentation: "products" | "services" })`, and
   `orders({ presentation: "orders" | "inquiries" })`.
8. Run dependency installation and type generation, then `karsa db sync`, apply the
   generated migration files, and run tests plus a production build.

Existing business and auth database table names are unchanged in 0.3. Never rewrite an applied
SQL migration merely to replace branding in comments; append migrations only when the schema
actually changes.
