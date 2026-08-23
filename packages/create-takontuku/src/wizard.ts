import { cancel, confirm, intro, isCancel, select, text } from "@clack/prompts";
import { NAME_PATTERN, NAME_RULE } from "./args";
import { detectPackageManager, PACKAGE_MANAGERS, type PackageManager } from "./environment";
import { titleCase } from "./template";

export const DEFAULT_BRAND = {
  locale: "id-ID",
  currency: "IDR",
  timeZone: "Asia/Jakarta",
} as const;

export interface Answers {
  projectName: string;
  manager: PackageManager;
  install: boolean;
  gitInit: boolean;
  brandName: string;
  locale: string;
  currency: string;
  timeZone: string;
}

/** Ends the process the way clack expects when someone hits Ctrl+C mid-prompt. */
function exitIfCancelled<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel("Cancelled. Nothing was created.");
    process.exit(0);
  }
  return value as T;
}

interface Choice {
  value: string;
  label: string;
  hint?: string;
}

const CUSTOM = " custom";

const LOCALES: Choice[] = [
  { value: "id-ID", label: "id-ID", hint: "Indonesia" },
  { value: "en-US", label: "en-US", hint: "English (US)" },
  { value: "en-SG", label: "en-SG", hint: "English (Singapore)" },
  { value: "ms-MY", label: "ms-MY", hint: "Malaysia" },
];

const CURRENCIES: Choice[] = [
  { value: "IDR", label: "IDR", hint: "Rupiah" },
  { value: "USD", label: "USD", hint: "US dollar" },
  { value: "SGD", label: "SGD", hint: "Singapore dollar" },
  { value: "MYR", label: "MYR", hint: "Ringgit" },
];

const TIME_ZONES: Choice[] = [
  { value: "Asia/Jakarta", label: "Asia/Jakarta", hint: "WIB" },
  { value: "Asia/Makassar", label: "Asia/Makassar", hint: "WITA" },
  { value: "Asia/Jayapura", label: "Asia/Jayapura", hint: "WIT" },
  { value: "Asia/Singapore", label: "Asia/Singapore", hint: "SGT" },
  { value: "Asia/Kuala_Lumpur", label: "Asia/Kuala_Lumpur", hint: "MYT" },
];

/**
 * A picker over the values that actually get used here, with a free-text
 * escape so the shortlist never becomes a cage -- these are exact codes
 * where a typo produces a subtly wrong store rather than an error, so
 * choosing beats typing for the common case.
 */
async function askChoice(message: string, choices: Choice[], fallback: string): Promise<string> {
  const picked = exitIfCancelled(
    await select({
      message,
      initialValue: fallback,
      options: [...choices, { value: CUSTOM, label: "Something else…" }],
    }),
  );
  if (picked !== CUSTOM) return picked;
  return exitIfCancelled(
    await text({
      message: `${message} (type it in)`,
      placeholder: fallback,
      validate: (value) => (value?.trim() ? undefined : "Cannot be empty."),
    }),
  ).trim();
}

async function askBrand(
  projectName: string,
): Promise<Pick<Answers, "brandName" | "locale" | "currency" | "timeZone">> {
  const brandName = exitIfCancelled(
    await text({
      message: "Store name",
      initialValue: titleCase(projectName),
      validate: (value) => (value?.trim() ? undefined : "Cannot be empty."),
    }),
  ).trim();
  const locale = await askChoice("Locale", LOCALES, DEFAULT_BRAND.locale);
  const currency = await askChoice("Currency", CURRENCIES, DEFAULT_BRAND.currency);
  const timeZone = await askChoice("Time zone", TIME_ZONES, DEFAULT_BRAND.timeZone);
  return { brandName, locale, currency, timeZone };
}

async function askProjectName(given: string | undefined): Promise<string> {
  if (given) return given;
  return exitIfCancelled(
    await text({
      message: "Project name",
      placeholder: "my-store",
      validate: (value) => (NAME_PATTERN.test(value ?? "") ? undefined : NAME_RULE),
    }),
  );
}

/** The full interactive path. Only reached on a TTY without `--yes`. */
export async function runWizard(
  given: string | undefined,
  noInstallFlag: boolean,
): Promise<Answers> {
  intro("create-takontuku");

  const projectName = await askProjectName(given);
  const manager = exitIfCancelled(
    await select({
      message: "Package manager",
      initialValue: detectPackageManager(),
      options: PACKAGE_MANAGERS.map((value) => ({ value, label: value })),
    }),
  );
  const install = noInstallFlag
    ? false
    : exitIfCancelled(await confirm({ message: "Install dependencies and set up the database?" }));
  const brand = await askBrand(projectName);
  const gitInit = exitIfCancelled(
    await confirm({ message: "Initialize a git repository?", initialValue: true }),
  );

  return { projectName, manager, install, gitInit, ...brand };
}

/** Non-interactive answers, from flags and defaults alone. */
export function defaultAnswers(projectName: string, noInstallFlag: boolean): Answers {
  return {
    projectName,
    manager: detectPackageManager(),
    install: !noInstallFlag,
    gitInit: false,
    brandName: titleCase(projectName),
    ...DEFAULT_BRAND,
  };
}
