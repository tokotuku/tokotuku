import { describe, expect, it } from "vitest";
import { parseWranglerConfig, stripJsonComments } from "./wrangler-config";

describe("stripJsonComments", () => {
  it("strips a line comment", () => {
    expect(stripJsonComments('{\n  "a": 1 // trailing comment\n}')).toBe('{\n  "a": 1 \n}');
  });

  it("strips a block comment", () => {
    expect(stripJsonComments('{ "a": /* inline */ 1 }')).toBe('{ "a":  1 }');
  });

  it("strips a full-line comment", () => {
    expect(stripJsonComments('{\n  // a comment on its own line\n  "a": 1\n}')).toBe(
      '{\n  \n  "a": 1\n}',
    );
  });

  it("leaves // inside a string value untouched", () => {
    expect(stripJsonComments('{ "url": "https://example.test" }')).toBe(
      '{ "url": "https://example.test" }',
    );
  });

  it("leaves /* and */ inside a string value untouched", () => {
    expect(stripJsonComments('{ "note": "a /* fake */ comment" }')).toBe(
      '{ "note": "a /* fake */ comment" }',
    );
  });

  it("respects an escaped quote inside a string", () => {
    expect(stripJsonComments('{ "note": "she said \\"hi\\" // not a comment" }')).toBe(
      '{ "note": "she said \\"hi\\" // not a comment" }',
    );
  });

  it("strips a trailing comma before a closing brace or bracket", () => {
    expect(stripJsonComments('{ "a": 1, }')).toBe('{ "a": 1 }');
    expect(stripJsonComments("[1, 2, ]")).toBe("[1, 2 ]");
  });

  it("leaves a comma that is not trailing untouched", () => {
    expect(stripJsonComments('{ "a": 1, "b": 2 }')).toBe('{ "a": 1, "b": 2 }');
  });

  it("leaves a comma inside a string value untouched even before a brace-like character", () => {
    expect(stripJsonComments('{ "note": "a, }" }')).toBe('{ "note": "a, }" }');
  });
});

const WRANGLER_JSONC = `{
  "name": "demo",
  // BETTER_AUTH_SECRET goes in .dev.vars, see https://example.test for details
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "demo-db",
      "database_id": "00000000-0000-0000-0000-000000000000"
    }
  ],
  "r2_buckets": [
    {
      "binding": "MEDIA",
      "bucket_name": "demo-media",
    }
  ],
}`;

describe("parseWranglerConfig", () => {
  it("extracts the D1 binding and R2 bucket name from a real-shaped wrangler.jsonc", () => {
    expect(parseWranglerConfig(WRANGLER_JSONC)).toEqual({
      d1DatabaseBinding: "DB",
      r2BucketName: "demo-media",
    });
  });

  it("throws a clear error when no D1 database is configured", () => {
    expect(() => parseWranglerConfig('{ "r2_buckets": [{ "bucket_name": "x" }] }')).toThrow(
      /d1_databases/,
    );
  });

  it("throws a clear error when no R2 bucket is configured", () => {
    expect(() => parseWranglerConfig('{ "d1_databases": [{ "binding": "DB" }] }')).toThrow(
      /r2_buckets/,
    );
  });
});
