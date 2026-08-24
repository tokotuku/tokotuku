import { describe, expect, it } from "vitest";
import {
  addImport,
  addModuleEntry,
  findImport,
  hasModuleEntry,
  listModuleEntries,
  locateModulesArray,
  removeImport,
  removeModuleEntry,
  scanImports,
} from "./astro-config";

// A representative client config -- including the load-bearing comment above
// defineConfig, a comment inside brand{}, a commented-out auth{} line, and a
// server{} block with its own comment.
const FIXTURE = `// @ts-check
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { auth } from "@karsa/auth";
import { catalog } from "@karsa/catalog";
import { karsa } from "@karsa/core";
import { orders } from "@karsa/orders";
import { defineConfig } from "astro/config";

// Remove a module here (and its matching import above + middleware.ts
// register line) to drop it from this client entirely — \`bun remove\` the
// package too. Nothing else references an uninstalled module by name.
export default defineConfig({
  integrations: [
    karsa({
      brand: {
        name: "Example Styled",
        locale: "id-ID",
        currency: "IDR",
        timeZone: "Asia/Jakarta",
        // Optional: use a local public asset or an absolute CDN/R2 URL.
        // auth: { backgroundImage: "/images/auth-commerce.webp", backgroundPosition: "center" },
      },
      modules: [auth(), catalog(), orders()],
    }),
  ],
  // @karsa/theme/styles.css is imported by DocumentLayout.astro and needs this plugin.
  vite: { plugins: [tailwindcss()] },
  output: "server",
  // A dedicated port keeps this neutral inline fixture isolated during tests.
  server: {
    host: "127.0.0.1",
    port: 4430,
  },
  adapter: cloudflare({
    persistState: true,
  }),
});
`;

describe("scanImports", () => {
  it("finds every top-level import with its specifier and named locals", () => {
    const imports = scanImports(FIXTURE);
    expect(imports.map((i) => i.specifier)).toEqual([
      "@astrojs/cloudflare",
      "@tailwindcss/vite",
      "@karsa/auth",
      "@karsa/catalog",
      "@karsa/core",
      "@karsa/orders",
      "astro/config",
    ]);
    expect(imports.find((i) => i.specifier === "@karsa/catalog")?.namedLocals).toEqual([
      { imported: "catalog", local: "catalog" },
    ]);
  });

  it("resolves an aliased named import's local name separately from its imported name", () => {
    const source = 'import { catalog as cat } from "@karsa/catalog";\ncat();\n';
    const imports = scanImports(source);
    expect(imports[0]?.namedLocals).toEqual([{ imported: "catalog", local: "cat" }]);
  });
});

describe("findImport", () => {
  it("finds the declaration for a given specifier", () => {
    expect(findImport(FIXTURE, "@karsa/orders")?.namedLocals[0]?.local).toBe("orders");
  });

  it("returns null when the specifier isn't imported", () => {
    expect(findImport(FIXTURE, "@karsa/blog")).toBeNull();
  });
});

describe("addImport", () => {
  it("inserts a new import in sorted position among the existing ones", () => {
    const { source, local } = addImport(FIXTURE, "@karsa/blog", "blog");
    expect(local).toBe("blog");
    const imports = scanImports(source);
    expect(imports.map((i) => i.specifier)).toEqual([
      "@astrojs/cloudflare",
      "@karsa/blog",
      "@tailwindcss/vite",
      "@karsa/auth",
      "@karsa/catalog",
      "@karsa/core",
      "@karsa/orders",
      "astro/config",
    ]);
  });

  it("is idempotent when the import already exists", () => {
    const { source, local } = addImport(FIXTURE, "@karsa/catalog", "catalog");
    expect(source).toBe(FIXTURE);
    expect(local).toBe("catalog");
  });

  it("refuses when the desired local name is already bound", () => {
    expect(() => addImport(FIXTURE, "@karsa/gift-cards", "catalog")).toThrow(
      /"catalog" is already bound/,
    );
  });

  it("refuses when the specifier is already imported without the requested name", () => {
    expect(() => addImport(FIXTURE, "@karsa/catalog", "somethingElse")).toThrow(
      /already imports from "@karsa\/catalog"/,
    );
  });
});

describe("removeImport", () => {
  it("removes the import when its local binding is unused elsewhere", () => {
    const source = 'import { blog } from "@karsa/blog";\nconsole.log("noop");\n';
    expect(removeImport(source, "@karsa/blog")).toBe('console.log("noop");\n');
  });

  it("leaves the import in place when its local binding is still referenced", () => {
    expect(removeImport(FIXTURE, "@karsa/orders")).toBe(FIXTURE);
  });

  it("no-ops when the specifier isn't imported", () => {
    expect(removeImport(FIXTURE, "@karsa/blog")).toBe(FIXTURE);
  });
});

describe("locateModulesArray / listModuleEntries", () => {
  it("finds the modules array and its callee names in order", () => {
    const { open, close } = locateModulesArray(FIXTURE);
    const entries = listModuleEntries(FIXTURE, open, close);
    expect(entries.map((e) => e.calleeName)).toEqual(["auth", "catalog", "orders"]);
  });

  it("refuses when there's no karsa() call", () => {
    expect(() => locateModulesArray('import { defineConfig } from "astro/config";\n')).toThrow(
      /Could not find an import of the karsa\(\) integration/,
    );
  });

  it("refuses when there's more than one karsa() call", () => {
    const source = `import { karsa } from "@karsa/core";
karsa({ modules: [] });
karsa({ modules: [] });
`;
    expect(() => locateModulesArray(source)).toThrow(/more than one karsa\(\) call/);
  });

  it('refuses when "modules" is not an array literal', () => {
    const source = `import { karsa } from "@karsa/core";
const MODULES = [];
karsa({ modules: MODULES });
`;
    expect(() => locateModulesArray(source)).toThrow(/is not an array literal/);
  });

  it('refuses when there is no "modules" key', () => {
    const source = `import { karsa } from "@karsa/core";
karsa({ brand: { name: "x" } });
`;
    expect(() => locateModulesArray(source)).toThrow(/no "modules: \[\.\.\.\]" array/);
  });
});

describe("hasModuleEntry", () => {
  it("is true for an installed module and false otherwise", () => {
    expect(hasModuleEntry(FIXTURE, "orders")).toBe(true);
    expect(hasModuleEntry(FIXTURE, "blog")).toBe(false);
  });
});

describe("addModuleEntry", () => {
  it("appends a new entry to a single-line array without disturbing anything else", () => {
    const result = addModuleEntry(FIXTURE, "blog");
    expect(result).toBe(
      FIXTURE.replace(
        "modules: [auth(), catalog(), orders()],",
        "modules: [auth(), catalog(), orders(), blog()],",
      ),
    );
  });

  it("is idempotent when the entry already exists", () => {
    expect(addModuleEntry(FIXTURE, "orders")).toBe(FIXTURE);
  });

  it("preserves the load-bearing comment block, the commented-out auth line, and the whole server{} block untouched", () => {
    const result = addModuleEntry(FIXTURE, "blog");
    expect(result).toContain(
      "// Remove a module here (and its matching import above + middleware.ts\n" +
        "// register line) to drop it from this client entirely — `bun remove` the\n" +
        "// package too. Nothing else references an uninstalled module by name.",
    );
    expect(result).toContain(
      '// auth: { backgroundImage: "/images/auth-commerce.webp", backgroundPosition: "center" },',
    );
    expect(result).toContain('  server: {\n    host: "127.0.0.1",\n    port: 4430,\n  },');
  });

  it("adds to an empty array without a leading comma", () => {
    const source = 'import { karsa } from "@karsa/core";\nkarsa({ modules: [] });\n';
    const result = addModuleEntry(source, "blog");
    expect(result).toContain("modules: [blog()]");
  });

  it("inserts a new line, with matching indent and a trailing comma, into a multi-line array", () => {
    const source = `import { auth } from "@karsa/auth";
import { karsa } from "@karsa/core";
karsa({
  modules: [
    auth(),
  ],
});
`;
    const result = addModuleEntry(source, "blog");
    expect(result).toBe(`import { auth } from "@karsa/auth";
import { karsa } from "@karsa/core";
karsa({
  modules: [
    auth(),
    blog(),
  ],
});
`);
  });

  it("does not corrupt a string value containing a closing paren", () => {
    const source =
      'import { karsa } from "@karsa/core";\nkarsa({ modules: [catalog({ label: "a ) b" })] });\n';
    const result = addModuleEntry(source, "blog");
    expect(result).toContain('catalog({ label: "a ) b" })');
    expect(result).toContain("blog()");
  });
});

describe("removeModuleEntry", () => {
  it("removes a middle entry, leaving valid neighbors", () => {
    const result = removeModuleEntry(FIXTURE, "catalog");
    expect(result).toContain("modules: [auth(), orders()],");
  });

  it("removes the last entry", () => {
    const result = removeModuleEntry(FIXTURE, "orders");
    expect(result).toContain("modules: [auth(), catalog()],");
  });

  it("removes the first entry", () => {
    const result = removeModuleEntry(FIXTURE, "auth");
    expect(result).toContain("modules: [catalog(), orders()],");
  });

  it("is idempotent when the entry is absent", () => {
    expect(removeModuleEntry(FIXTURE, "blog")).toBe(FIXTURE);
  });

  it("preserves the load-bearing comment block, the commented-out auth line, and the whole server{} block byte-identical after removing orders()", () => {
    const result = removeModuleEntry(FIXTURE, "orders");
    expect(result).toContain(
      "// Remove a module here (and its matching import above + middleware.ts\n" +
        "// register line) to drop it from this client entirely — `bun remove` the\n" +
        "// package too. Nothing else references an uninstalled module by name.",
    );
    expect(result).toContain(
      '// auth: { backgroundImage: "/images/auth-commerce.webp", backgroundPosition: "center" },',
    );
    expect(result).toContain('  server: {\n    host: "127.0.0.1",\n    port: 4430,\n  },');
    // Nothing outside the modules[] line itself should have changed.
    expect(
      result.replace("modules: [auth(), catalog()],", "modules: [auth(), catalog(), orders()],"),
    ).toBe(FIXTURE);
  });

  it("does not corrupt a string value containing a closing paren while removing a different entry", () => {
    const source =
      'import { karsa } from "@karsa/core";\nkarsa({ modules: [catalog({ label: "a ) b" }), orders()] });\n';
    const result = removeModuleEntry(source, "orders");
    expect(result).toContain('catalog({ label: "a ) b" })');
    expect(result).not.toContain("orders()");
  });

  it("refuses when the array contains an entry it can't identify", () => {
    const source = 'import { karsa } from "@karsa/core";\nkarsa({ modules: [auth(), ...rest] });\n';
    expect(() => removeModuleEntry(source, "auth")).toThrow(/entry this CLI can't identify/);
  });
});
