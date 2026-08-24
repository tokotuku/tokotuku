import { describe, expect, it } from "vitest";
import { addRegisterImport, removeRegisterImport } from "./middleware-source";

// Representative scaffold middleware and the shape preserved by the CLI.
const FIXTURE = `import { defineMiddleware } from "astro:middleware";
import "@karsa/auth/register";
import "@karsa/catalog/register";

export const onRequest = defineMiddleware((_context, next) => next());
`;

describe("addRegisterImport", () => {
  it("inserts in sorted position within the register-import block", () => {
    const result = addRegisterImport(FIXTURE, "@karsa/blog/register");
    expect(result).toBe(`import { defineMiddleware } from "astro:middleware";
import "@karsa/auth/register";
import "@karsa/blog/register";
import "@karsa/catalog/register";

export const onRequest = defineMiddleware((_context, next) => next());
`);
  });

  it("is idempotent when already present", () => {
    expect(addRegisterImport(FIXTURE, "@karsa/catalog/register")).toBe(FIXTURE);
  });

  it("appends after the last import when there is no existing register-import block", () => {
    const source = `import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware((_context, next) => next());
`;
    const result = addRegisterImport(source, "@karsa/blog/register");
    expect(result).toBe(`import { defineMiddleware } from "astro:middleware";
import "@karsa/blog/register";

export const onRequest = defineMiddleware((_context, next) => next());
`);
  });
});

describe("removeRegisterImport", () => {
  it("removes exactly the matching line, leaving the rest byte-identical", () => {
    const result = removeRegisterImport(FIXTURE, "@karsa/catalog/register");
    expect(result).toBe(`import { defineMiddleware } from "astro:middleware";
import "@karsa/auth/register";

export const onRequest = defineMiddleware((_context, next) => next());
`);
  });

  it("is a no-op when the import isn't present", () => {
    expect(removeRegisterImport(FIXTURE, "@karsa/blog/register")).toBe(FIXTURE);
  });
});
