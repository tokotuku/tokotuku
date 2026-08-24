// `cloudflare:workers`'s real types only exist inside a live Cloudflare
// project (from `wrangler types`), which no package has standalone. This
// ambient declaration lets every package typecheck `import { env } from
// "cloudflare:workers"` against the same structural contract the rest of
// the framework already uses, instead of excluding every file that touches
// it from typecheck entirely.
declare module "cloudflare:workers" {
  const env: import("./env").KarsaEnv;

  export { env };
}
