export interface MessageDictionaries {
  id: Record<string, string>;
  en: Record<string, string>;
}

export interface MessageValues {
  [key: string]: string | number | undefined;
}

export type Translator = (key: string, values?: MessageValues) => string;

interface MessageBrand {
  locale: string;
  messages?: Record<string, string>;
}

function isDevelopment(): boolean {
  return typeof process !== "undefined" && process.env.NODE_ENV !== "production";
}

const knownNamespaces = ["auth.", "admin.", "catalog.", "orders.", "booking."];

/** Resolve a package-owned localized dictionary and apply client overrides. */
export function createTranslator(
  brand: MessageBrand,
  dictionaries: MessageDictionaries,
): Translator {
  const locale = brand.locale.toLowerCase().startsWith("id") ? "id" : "en";
  const defaults = dictionaries[locale] ?? dictionaries.en;
  const messages = { ...defaults };
  const packageNamespaces = new Set(
    Object.keys(defaults).map((key) => `${key.split(".")[0] ?? key}.`),
  );

  for (const [key, value] of Object.entries(brand.messages ?? {})) {
    if (key in defaults) {
      messages[key] = value;
    } else if (
      isDevelopment() &&
      (packageNamespaces.has(`${key.split(".")[0] ?? key}.`) ||
        !knownNamespaces.some((namespace) => key.startsWith(namespace)))
    ) {
      console.warn(`[karsa] Unknown message override: ${key}`);
    }
  }

  return (key, values = {}) => {
    const template = messages[key] ?? key;
    const fallbackTemplate =
      (!isDevelopment() && key in defaults ? defaults[key] : template) ?? key;
    return fallbackTemplate.replace(/\{([a-zA-Z][\w.]*)\}/g, (match, name: string) => {
      const value = values[name];
      if (value === undefined) {
        if (isDevelopment()) return match;
        return "";
      }
      return String(value);
    });
  };
}

export const coreMessages: MessageDictionaries = {
  id: {
    "site.announcement": "Dibangun dengan Karsa.",
    "site.hero.eyebrow": "Karsa · platform situs modular",
    "site.hero.title": "Wujudkan situs sesuai karsamu.",
    "site.hero.description":
      "Mulai dari fondasi yang netral, lalu susun modul untuk profil perusahaan, produk, layanan, atau publikasi.",
    "site.hero.cta": "Mulai berkarya",
    "site.footer.tagline": "Situs modular untuk karya yang punya tujuan.",
    "site.footer.newsletterLabel": "Tetap terhubung",
    "site.footer.newsletterHint": "Kabar dan tulisan terbaru, sesekali.",
    "site.footer.newsletterEmail": "Alamat email",
    "site.footer.newsletterSubmit": "Berlangganan",
    "site.footer.navigation": "Navigasi footer",
    "site.footer.madeWith": "Dibuat dengan niat.",
    "admin.nav.section.site": "Situs",
    "admin.nav.theme": "Ganti tema warna",
    "admin.nav.search": "Cari navigasi",
    "admin.nav.searchPlaceholder": "Cari menu",
    "admin.nav.openMenu": "Buka menu",
    "admin.nav.closeMenu": "Tutup menu",
    "admin.nav.signOut": "Keluar",
    "admin.nav.defaultUser": "Admin",
    "admin.nav.dashboardAria": "Navigasi situs",
    "admin.nav.brandDashboard": "Dashboard {brand}",
    "admin.nav.attribution": "Dibuat dengan Karsa UI",
    "admin.dashboard.title": "Kelola {brand}",
    "admin.dashboard.greeting": "Selamat datang, {name}",
    "admin.dashboard.welcomeEyebrow": "Ringkasan situs",
    "admin.dashboard.description":
      "Pantau aktivitas situs dan kelola pekerjaanmu dari satu tempat.",
    "admin.dashboard.workspaceTitle": "Ruang kerja situs",
    "admin.dashboard.workspaceDescription": "Buka area kerja yang tersedia untuk mengelola situs.",
    "admin.dashboard.moduleDescription": "Buka workspace {name}.",
    "admin.dashboard.configurationTitle": "Konfigurasi situs",
    "admin.dashboard.installedModules": "Modul terpasang",
    "admin.dashboard.locale": "Bahasa",
    "admin.dashboard.currency": "Mata uang",
    "admin.dashboard.timeZone": "Zona waktu",
    "admin.dashboard.role": "Peran",
    "admin.dashboard.gettingStartedTitle": "Ruang kerja siap digunakan",
    "admin.dashboard.gettingStartedDescription": "Gunakan modul yang sesuai dengan tujuan situsmu.",
    "admin.dashboard.workspaceReady": "Workspace siap",
    "admin.dashboard.workspaceStatus": "Status workspace",
    "admin.dashboard.ready": "Siap",
    "admin.dashboard.statusDescription": "Semua sistem berjalan normal.",
    "admin.dashboard.activeModules": "Modul aktif",
    "admin.dashboard.activeModulesDescription": "Modul terpasang dan siap digunakan.",
    "admin.dashboard.setup": "Setup",
    "admin.dashboard.setupDescription": "{completed} dari {total} langkah selesai.",
    "admin.dashboard.nextSteps": "Langkah berikutnya",
    "admin.dashboard.workspaceStartTitle": "Mulai kelola situs dengan modul yang kamu butuhkan.",
    "admin.dashboard.workspaceStartDescription":
      "Gunakan modul yang sudah terpasang, atau tambahkan modul lain sesuai kebutuhan.",
    "admin.dashboard.addModuleHint": "Tambahkan modul sesuai kebutuhan untuk mulai bekerja.",
    "admin.dashboard.inspectorDescription": "Konfigurasi aktif untuk aplikasi ini.",
    "admin.dashboard.identity": "Identitas",
    "admin.dashboard.readinessAdmin": "Administrator siap",
    "admin.dashboard.readinessBrand": "Kustomisasi nama brand",
    "admin.dashboard.readinessLogo": "Tambahkan logo brand",
    "admin.dashboard.setupCompletedCount": "Setup {percentage} persen selesai",
    "admin.dashboard.openModule": "Buka {name}",
    "admin.dashboard.coreModule": "Core",
    "admin.error.backHome": "Kembali ke beranda",
    "admin.error.backDashboard": "Kembali ke dashboard",
    "admin.error.notFoundTitle": "Halaman tidak ditemukan",
    "admin.error.forbiddenTitle": "Akses tidak tersedia",
    "admin.error.notFoundDescription": "Halaman yang kamu cari tidak ada atau sudah dipindahkan.",
    "admin.error.forbiddenDescription":
      "Akun ini belum memiliki izin untuk membuka halaman tersebut.",
    "admin.error.switchAccount": "Ganti akun",
    "admin.error.contactSupport": "Hubungi dukungan",
  },
  en: {
    "site.announcement": "Built with Karsa.",
    "site.hero.eyebrow": "Karsa · modular website platform",
    "site.hero.title": "Shape a site around your intent.",
    "site.hero.description":
      "Start with a neutral foundation, then compose modules for a company, products, services, or publication.",
    "site.hero.cta": "Start creating",
    "site.footer.tagline": "A modular site for purposeful work.",
    "site.footer.newsletterLabel": "Stay in the loop",
    "site.footer.newsletterHint": "Occasional news and new writing.",
    "site.footer.newsletterEmail": "Email address",
    "site.footer.newsletterSubmit": "Subscribe",
    "site.footer.navigation": "Footer navigation",
    "site.footer.madeWith": "Made with intention.",
    "admin.nav.section.site": "Site",
    "admin.nav.theme": "Toggle color theme",
    "admin.nav.search": "Search navigation",
    "admin.nav.searchPlaceholder": "Search menu",
    "admin.nav.openMenu": "Open menu",
    "admin.nav.closeMenu": "Close menu",
    "admin.nav.signOut": "Log out",
    "admin.nav.defaultUser": "Admin",
    "admin.nav.dashboardAria": "Site navigation",
    "admin.nav.brandDashboard": "{brand} dashboard",
    "admin.nav.attribution": "Built with Karsa UI",
    "admin.dashboard.title": "Manage {brand}",
    "admin.dashboard.greeting": "Welcome, {name}",
    "admin.dashboard.welcomeEyebrow": "Site overview",
    "admin.dashboard.description": "Track site activity and manage your work from one place.",
    "admin.dashboard.workspaceTitle": "Site workspace",
    "admin.dashboard.workspaceDescription": "Open an available workspace to manage your site.",
    "admin.dashboard.moduleDescription": "Open the {name} workspace.",
    "admin.dashboard.configurationTitle": "Site configuration",
    "admin.dashboard.installedModules": "Installed modules",
    "admin.dashboard.locale": "Locale",
    "admin.dashboard.currency": "Currency",
    "admin.dashboard.timeZone": "Time zone",
    "admin.dashboard.role": "Role",
    "admin.dashboard.gettingStartedTitle": "Your workspace is ready to use",
    "admin.dashboard.gettingStartedDescription": "Use the modules that match your site's purpose.",
    "admin.dashboard.workspaceReady": "Workspace ready",
    "admin.dashboard.workspaceStatus": "Workspace status",
    "admin.dashboard.ready": "Ready",
    "admin.dashboard.statusDescription": "All systems are running normally.",
    "admin.dashboard.activeModules": "Active modules",
    "admin.dashboard.activeModulesDescription": "Installed modules ready to use.",
    "admin.dashboard.setup": "Setup",
    "admin.dashboard.setupDescription": "{completed} of {total} steps complete.",
    "admin.dashboard.nextSteps": "Next steps",
    "admin.dashboard.workspaceStartTitle": "Start managing your site with the modules you need.",
    "admin.dashboard.workspaceStartDescription":
      "Use the modules already installed, or add another when you need it.",
    "admin.dashboard.addModuleHint": "Add the modules you need to start working.",
    "admin.dashboard.inspectorDescription": "The active configuration for this app.",
    "admin.dashboard.identity": "Identity",
    "admin.dashboard.readinessAdmin": "Administrator ready",
    "admin.dashboard.readinessBrand": "Customize brand name",
    "admin.dashboard.readinessLogo": "Add brand logo",
    "admin.dashboard.setupCompletedCount": "Setup {percentage} percent complete",
    "admin.dashboard.openModule": "Open {name}",
    "admin.dashboard.coreModule": "Core",
    "admin.error.backHome": "Back home",
    "admin.error.backDashboard": "Back to dashboard",
    "admin.error.notFoundTitle": "Page not found",
    "admin.error.forbiddenTitle": "Access unavailable",
    "admin.error.notFoundDescription": "The page you are looking for does not exist or has moved.",
    "admin.error.forbiddenDescription": "This account does not have permission to open that page.",
    "admin.error.switchAccount": "Switch account",
    "admin.error.contactSupport": "Contact support",
  },
};
