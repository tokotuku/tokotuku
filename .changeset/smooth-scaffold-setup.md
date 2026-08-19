---
"create-takontuku": minor
"@takontuku/auth": patch
---

`create-takontuku` is now an interactive wizard that finishes setup itself,
instead of printing nine manual steps for you to run.

On a terminal it asks for the project name (when not given as an argument),
which package manager to use, whether to install, whether to customize branding
(store name, locale, currency, time zone), and whether to `git init`. It then
runs install, `cf-typegen`, `takontuku db sync`, and `wrangler d1 migrations
apply DB --local` itself, so a scaffold is ready for `dev` in one command. Each
step is recoverable: a failure names the step, prints the underlying error, and
stops rather than cascading, leaving the (already valid) project files in place.

Prompts are skipped entirely when stdin is not a TTY or `--yes` is passed, so
scripts and CI keep the old flags-and-defaults behaviour and never block waiting
on input.

Generating `.dev.vars` also closes a real gap. `@takontuku/auth` passes
`BETTER_AUTH_SECRET` straight to better-auth with no fallback of its own, and the
scaffold never created that file nor mentioned it — so every scaffolded app
silently signed its sessions with better-auth's hardcoded public default.

New flags: `--yes` (take every default, never prompt), `--no-install` (copy files
only, print the manual steps), `--seed` (also run `takontuku db seed`), and
`--registry <url>` (write a scoped `.npmrc`, for resolving `@takontuku/*` from a
private registry).

The `wrangler d1 create` and `wrangler r2 bucket create` steps moved out of the
setup path and into a "deploying later" note. Neither was ever needed for local
dev — the placeholder database id works as-is, and miniflare simulates R2 — which
the template's own comments and the examples' READMEs already said.

`@takontuku/auth` now requires `better-auth >=1.6.23 <1.7.0`. 1.7.0 adds an
`issuer` column to the `account` table that this package's migrations don't
create, which broke admin setup on the first POST for anyone installing fresh.
