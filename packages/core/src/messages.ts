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

const knownNamespaces = ["auth.", "admin.", "catalog.", "orders."];

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
      console.warn(`[tokotuku] Unknown message override: ${key}`);
    }
  }

  return (key, values = {}) => {
    const template = messages[key] ?? key;
    const fallbackTemplate =
      (!isDevelopment() && key in defaults ? defaults[key] : template) ?? key;
    return fallbackTemplate.replace(/\{([a-zA-Z][\w.]*)\}/g, (match, name: string) => {
      const value = values[name];
      return value === undefined ? (isDevelopment() ? match : "") : String(value);
    });
  };
}

export const coreMessages: MessageDictionaries = {
  id: {
    "admin.nav.section.store": "Toko",
    "admin.nav.theme": "Ganti tema warna",
    "admin.nav.openMenu": "Buka menu",
    "admin.nav.closeMenu": "Tutup menu",
    "admin.nav.signOut": "Keluar",
    "admin.nav.defaultUser": "Admin",
    "admin.nav.dashboardAria": "Navigasi toko",
    "admin.nav.brandDashboard": "Dashboard {brand}",
    "admin.nav.attribution": "Dibuat dengan Tokotuku UI",
    "admin.dashboard.title": "Kelola {brand}",
    "admin.dashboard.greeting": "Selamat datang, {name}",
    "admin.dashboard.workspaceTitle": "Workspace toko",
    "admin.dashboard.workspaceDescription": "Buka area kerja yang tersedia untuk mengelola toko.",
    "admin.dashboard.moduleDescription": "Buka workspace {name}.",
    "admin.dashboard.configurationTitle": "Konfigurasi toko",
    "admin.dashboard.installedModules": "Modul terpasang",
    "admin.dashboard.locale": "Bahasa",
    "admin.dashboard.currency": "Mata uang",
    "admin.dashboard.timeZone": "Zona waktu",
    "admin.dashboard.role": "Peran",
    "admin.dashboard.gettingStartedTitle": "Workspace siap digunakan",
    "admin.dashboard.gettingStartedDescription":
      "Pasang modul Catalog atau Orders untuk mulai mengelola data toko.",
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
    "admin.nav.section.store": "Store",
    "admin.nav.theme": "Toggle color theme",
    "admin.nav.openMenu": "Open menu",
    "admin.nav.closeMenu": "Close menu",
    "admin.nav.signOut": "Log out",
    "admin.nav.defaultUser": "Admin",
    "admin.nav.dashboardAria": "Store navigation",
    "admin.nav.brandDashboard": "{brand} dashboard",
    "admin.nav.attribution": "Built with Tokotuku UI",
    "admin.dashboard.title": "Manage {brand}",
    "admin.dashboard.greeting": "Welcome back, {name}",
    "admin.dashboard.workspaceTitle": "Store workspace",
    "admin.dashboard.workspaceDescription": "Open an available workspace to manage your store.",
    "admin.dashboard.moduleDescription": "Open the {name} workspace.",
    "admin.dashboard.configurationTitle": "Store configuration",
    "admin.dashboard.installedModules": "Installed modules",
    "admin.dashboard.locale": "Locale",
    "admin.dashboard.currency": "Currency",
    "admin.dashboard.timeZone": "Time zone",
    "admin.dashboard.role": "Role",
    "admin.dashboard.gettingStartedTitle": "Your workspace is ready",
    "admin.dashboard.gettingStartedDescription":
      "Install the Catalog or Orders module to start managing store data.",
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
