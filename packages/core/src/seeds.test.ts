import { describe, expect, it } from "vitest";
import { assertKeyIsPublic, deriveMediaKey, mimeTypeForFile, planSeedSql } from "./seeds";

describe("planSeedSql", () => {
  it("flattens every module's seeds in topo order, tagged with the owning module", () => {
    const auth = { name: "auth", seeds: [] };
    const catalog = {
      name: "catalog",
      seeds: [{ name: "demo-catalog", sql: new URL("https://example.test/catalog/demo.sql") }],
    };

    const plan = planSeedSql([auth, catalog]);

    expect(plan).toEqual([{ moduleName: "catalog", sql: catalog.seeds[0]?.sql }]);
  });

  it("carries a module with multiple seeds through in declaration order", () => {
    const catalog = {
      name: "catalog",
      seeds: [
        { name: "a", sql: new URL("https://example.test/a.sql") },
        { name: "b", sql: new URL("https://example.test/b.sql") },
      ],
    };

    const plan = planSeedSql([catalog]);

    expect(plan.map((item) => item.sql.href)).toEqual([
      "https://example.test/a.sql",
      "https://example.test/b.sql",
    ]);
  });

  it("produces an empty plan when no module declares a seed", () => {
    expect(planSeedSql([{ name: "auth", seeds: [] }])).toEqual([]);
  });
});

describe("mimeTypeForFile", () => {
  it("maps known image extensions, case-insensitively", () => {
    expect(mimeTypeForFile("widget.svg")).toBe("image/svg+xml");
    expect(mimeTypeForFile("widget.SVG")).toBe("image/svg+xml");
    expect(mimeTypeForFile("photo.jpg")).toBe("image/jpeg");
    expect(mimeTypeForFile("photo.jpeg")).toBe("image/jpeg");
    expect(mimeTypeForFile("icon.png")).toBe("image/png");
    expect(mimeTypeForFile("banner.webp")).toBe("image/webp");
  });

  it("works against a full path, not just a bare filename", () => {
    expect(mimeTypeForFile("/abs/path/products/widget.svg")).toBe("image/svg+xml");
  });

  it("falls back to application/octet-stream for an unknown extension", () => {
    expect(mimeTypeForFile("data.bin")).toBe("application/octet-stream");
    expect(mimeTypeForFile("no-extension")).toBe("application/octet-stream");
  });
});

describe("deriveMediaKey", () => {
  it("derives a forward-slash key from a file's path relative to the media root", () => {
    expect(deriveMediaKey("/app/seeds/media", "/app/seeds/media/products/widget.svg")).toBe(
      "products/widget.svg",
    );
  });

  it("derives a top-level key when the file sits directly in the media root", () => {
    expect(deriveMediaKey("/app/seeds/media", "/app/seeds/media/logo.svg")).toBe("logo.svg");
  });
});

describe("assertKeyIsPublic", () => {
  it("does not throw when the key matches a declared prefix", () => {
    expect(() => assertKeyIsPublic("products/widget.svg", ["products/"], "catalog")).not.toThrow();
  });

  it("throws, naming the key and module, when no prefix matches", () => {
    expect(() => assertKeyIsPublic("secrets/widget.svg", ["products/"], "catalog")).toThrow(
      /"secrets\/widget\.svg".*"catalog"/s,
    );
  });

  it("throws when there are no declared prefixes at all", () => {
    expect(() => assertKeyIsPublic("products/widget.svg", [], "catalog")).toThrow();
  });
});
