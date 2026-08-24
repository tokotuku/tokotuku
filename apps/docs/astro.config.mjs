import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

const page = (label, id, slug) => ({ label, translations: { id }, slug });
const group = (label, id, items, collapsed = false) => ({
  label,
  translations: { id },
  items,
  collapsed,
});

export default defineConfig({
  // Override this in deployment so canonical URLs and sitemap entries use the
  // public docs host. The localhost default keeps local/preview builds honest.
  site: process.env.DOCS_SITE_URL ?? "http://localhost:4321",
  vite: {
    plugins: [tailwindcss()],
    build: {
      // The chart reference intentionally ships ECharts only on its two docs
      // pages. Its minified chunk remains below the enforced gzip asset budget.
      chunkSizeWarningLimit: 900,
    },
  },
  integrations: [
    starlight({
      title: { en: "Karsa", id: "Karsa" },
      description:
        "A site-neutral Astro foundation for accessible interfaces, content, and modular applications.",
      defaultLocale: "en",
      locales: {
        en: { label: "English", lang: "en" },
        id: { label: "Bahasa Indonesia", lang: "id" },
      },
      favicon: "/favicon.png",
      logo: { src: "./src/assets/karsa-logo.png", alt: "Karsa", replacesTitle: true },
      social: [{ icon: "github", label: "GitHub", href: "https://github.com/karsa-ui/karsa" }],
      sidebar: [
        group("Start", "Mulai", [
          page("Overview", "Ringkasan", ""),
          page("Getting started", "Mulai cepat", "getting-started"),
          page("Choose a preset", "Pilih preset", "presets"),
          page("Theming", "Tema", "theming"),
        ]),
        group("Guides", "Panduan", [
          page("Company sites", "Situs perusahaan", "guides/company"),
          page("Product sites", "Situs produk", "guides/product"),
          page("Service sites", "Situs layanan", "guides/service"),
          page("Publication sites", "Situs publikasi", "guides/publication"),
          page("Content and blog authoring", "Menulis konten dan blog", "content/blog-authoring"),
        ]),
        group("Architecture", "Arsitektur", [
          page("Modules", "Modul", "modules"),
          page("Contribution contracts", "Kontrak kontribusi", "modules/contributions"),
          page("Deployment and registry", "Deployment dan registry", "deployment/registry"),
        ]),
        group("Reference", "Referensi", [
          page("Component reference", "Referensi komponen", "reference/components"),
          page("Auth registration modes", "Mode registrasi auth", "auth/registration-modes"),
          page("AI workflow", "Alur kerja AI", "ai/workflow"),
          page("Migration 0.2 → 0.3", "Migrasi 0.2 → 0.3", "migration/0-2-to-0-3"),
        ]),
        group(
          "Components",
          "Komponen",
          [
            page("Button", "Button", "components/button"),
            page("Input", "Input", "components/input"),
            page("Card", "Card", "components/card"),
            group(
              "Starter",
              "Starter",
              [
                group(
                  "Feedback",
                  "Feedback",
                  [
                    page("Alert", "Alert", "starter/feedback/alert"),
                    page("EmptyState", "Empty state", "starter/feedback/empty-state"),
                    page("Skeleton", "Skeleton", "starter/feedback/skeleton"),
                  ],
                  true,
                ),
                group(
                  "Data display",
                  "Tampilan data",
                  [
                    page("Badge", "Badge", "starter/data-display/badge"),
                    page("DataTable", "Tabel data", "starter/data-display/data-table"),
                    page("StatCard", "Kartu statistik", "starter/data-display/stat-card"),
                  ],
                  true,
                ),
                group(
                  "Layout",
                  "Layout",
                  [
                    page("AppShell", "Shell aplikasi", "starter/layout/app-shell"),
                    page("AppSidebar", "Sidebar aplikasi", "starter/layout/app-sidebar"),
                    page("AppTopbar", "Topbar aplikasi", "starter/layout/app-topbar"),
                    page("PageHeader", "Header halaman", "starter/layout/page-header"),
                    page("SiteHeader", "Header situs", "starter/layout/site-header"),
                  ],
                  true,
                ),
                group(
                  "Navigation",
                  "Navigasi",
                  [
                    page("Pagination", "Pagination", "starter/navigation/pagination"),
                    page("Tabs", "Tab", "starter/navigation/tabs"),
                  ],
                  true,
                ),
                group(
                  "Commerce and charts",
                  "Produk dan chart",
                  [
                    page("ProductCard", "Kartu produk", "starter/commerce/product-card"),
                    page("Chart", "Chart", "starter/commerce/chart"),
                  ],
                  true,
                ),
              ],
              true,
            ),
          ],
          true,
        ),
      ],
    }),
  ],
});
