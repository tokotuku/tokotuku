import { describe, expect, it } from "vitest";
import { addRegisterImport, removeRegisterImport } from "./middleware-source";

// Representative scaffold middleware and the shape preserved by the CLI.
const FIXTURE = `import { defineMiddleware } from "astro:middleware";
import "@takontuku/auth/register";
import "@takontuku/catalog/register";

export const onRequest = defineMiddleware((_context, next) => next());
`;

describe("addRegisterImport", () => {
  it("inserts in sorted position within the register-import block", () => {
    const result = addRegisterImport(FIXTURE, "@takontuku/blog/register");
    expect(result).toBe(`import { defineMiddleware } from "astro:middleware";
import "@takontuku/auth/register";
import "@takontuku/blog/register";
import "@takontuku/catalog/register";

export const onRequest = defineMiddleware((_context, next) => next());
`);
  });

  it("is idempotent when already present", () => {
    expect(addRegisterImport(FIXTURE, "@takontuku/catalog/register")).toBe(FIXTURE);
  });

  it("appends after the last import when there is no existing register-import block", () => {
    const source = `import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware((_context, next) => next());
`;
    const result = addRegisterImport(source, "@takontuku/blog/register");
    expect(result).toBe(`import { defineMiddleware } from "astro:middleware";
import "@takontuku/blog/register";

export const onRequest = defineMiddleware((_context, next) => next());
`);
  });
});

describe("removeRegisterImport", () => {
  it("removes exactly the matching line, leaving the rest byte-identical", () => {
    const result = removeRegisterImport(FIXTURE, "@takontuku/catalog/register");
    expect(result).toBe(`import { defineMiddleware } from "astro:middleware";
import "@takontuku/auth/register";

export const onRequest = defineMiddleware((_context, next) => next());
`);
  });

  it("is a no-op when the import isn't present", () => {
    expect(removeRegisterImport(FIXTURE, "@takontuku/blog/register")).toBe(FIXTURE);
  });
});
