import { createRequire } from "node:module";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

const root = resolve(new URL("..", import.meta.url).pathname);
const require = createRequire(import.meta.url);
let build;
try {
  ({ build } = await import("esbuild"));
} catch {
  ({ build } = require(resolve(root, "node_modules/.bun/node_modules/esbuild")));
}

const budgets = {
  authRoot: 5 * 1024,
  authClient: 15 * 1024,
  cart: 2 * 1024,
  chartRuntime: 300 * 1024,
};

async function bundledGzipBytes(entryPoint, options = {}) {
  const result = await build({
    entryPoints: [resolve(root, entryPoint)],
    bundle: true,
    format: "esm",
    minify: true,
    platform: "browser",
    write: false,
    ...options,
  });
  const output = result.outputFiles?.[0]?.contents;
  if (!output) throw new Error(`No bundle output was produced for ${entryPoint}.`);
  return gzipSync(output).byteLength;
}

const measured = {
  authRoot: await bundledGzipBytes("packages/auth/src/index.ts", {
    platform: "node",
    external: ["@karsa/core"],
  }),
  authClient: await bundledGzipBytes("packages/auth/src/auth-client.ts", {
    // Measure the actual browser client payload; unlike the server-facing root
    // entry, this subpath intentionally owns its better-auth/client dependency.
  }),
  cart: await bundledGzipBytes("packages/orders/src/client/cart.ts"),
  chartRuntime: await bundledGzipBytes("packages/charts/src/runtime.ts"),
};

const failures = Object.entries(measured).flatMap(([name, bytes]) => {
  const budget = budgets[name];
  return bytes <= budget ? [] : [`${name} is ${bytes} bytes gzip; budget is ${budget}.`];
});

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

process.stdout.write(
  `Performance budgets passed: ${Object.entries(measured)
    .map(([name, bytes]) => `${name}=${bytes}B gzip`)
    .join(", ")}\n`,
);
