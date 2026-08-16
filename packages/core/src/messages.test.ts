import { afterEach, describe, expect, it, vi } from "vitest";
import { coreMessages, createTranslator, type MessageDictionaries } from "./messages";

const dictionaries: MessageDictionaries = {
  id: { greeting: "Halo {name}", count: "{count} item" },
  en: { greeting: "Hello {name}", count: "{count} item" },
};

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  vi.restoreAllMocks();
});

describe("createTranslator", () => {
  it("keeps the core Indonesian and English dictionaries in sync", () => {
    expect(Object.keys(coreMessages.id).sort()).toEqual(Object.keys(coreMessages.en).sort());
  });

  it("selects Indonesian defaults and interpolates values", () => {
    const t = createTranslator({ locale: "id-ID" }, dictionaries);
    expect(t("greeting", { name: "Rani" })).toBe("Halo Rani");
  });

  it("selects English defaults for non-Indonesian locales", () => {
    const t = createTranslator({ locale: "en-US" }, dictionaries);
    expect(t("greeting", { name: "Rani" })).toBe("Hello Rani");
  });

  it("applies sparse brand overrides after package defaults", () => {
    const t = createTranslator(
      { locale: "id-ID", messages: { greeting: "Selamat datang, {name}" } },
      dictionaries,
    );
    expect(t("greeting", { name: "Rani" })).toBe("Selamat datang, Rani");
  });

  it("warns for unknown overrides in development and leaves missing placeholders visible", () => {
    process.env.NODE_ENV = "development";
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const t = createTranslator({ locale: "id-ID", messages: { missing: "Nope" } }, dictionaries);
    expect(warning).toHaveBeenCalledWith("[takontuku] Unknown message override: missing");
    expect(t("greeting")).toBe("Halo {name}");
  });

  it("removes missing placeholder values in production", () => {
    process.env.NODE_ENV = "production";
    const t = createTranslator(
      { locale: "id-ID", messages: { greeting: "Hai {name}" } },
      dictionaries,
    );
    expect(t("greeting")).toBe("Halo ");
  });
});
