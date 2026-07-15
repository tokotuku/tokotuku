# Tokotuku UI — next-phase build prompts

Five self-contained prompts, in recommended execution order. Each one assumes
a **fresh Claude Code session with no memory of prior work** — paste the
"Shared context" section into every session first (or keep it in
`CLAUDE.md`), then paste that prompt's section.

Repo: `/Volumes/external/Works/rivana/tokotuku` — Bun workspace + Moon task
runner. Run `bun install && bun run build` once before starting any of these.

---

## Shared context — paste into every session

```
This is Tokotuku UI, a Bun/Moon monorepo building a framework-agnostic Web
Components design system (Lit + Shadow DOM) with first-class Astro support.

Workspace layout:
- packages/core     framework-agnostic utilities (DOM, keyboard, events) — zero UI
- packages/tokens    raw design tokens (spacing, radius, shadow, typography, duration, colors) — plain JS objects
- packages/theme     tokens -> CSS custom properties (--tk-*), light/dark/high-contrast palettes
- packages/elements  tk-* Web Components (Lit), the actual design system
- packages/astro     thin .astro wrappers around @tokotuku/elements — no logic duplication
- packages/icons     tree-shakeable SVG icons
- packages/cli       dev CLI (create component, generate icon/docs/playground/changelog)
- packages/testing   shared Vitest fixture + Playwright a11y helpers
- apps/playground    Vite app, manual testing ground for components
- apps/docs          Astro + Starlight documentation site
- apps/example       Astro on Cloudflare Workers+D1+R2 demo — unrelated to the design system except as a consumer

Established conventions (packages/elements/README.md is the source of truth,
keep it updated as conventions evolve):
- Tag prefix `tk-`, via `tagName("x")` from packages/elements/src/constants.ts.
  Event prefix same: `tk-change`, `tk-open`, etc., always a typed CustomEvent
  via TypedEvent<T> from @tokotuku/core (packages/core/src/events/typed-event.ts).
- Per-component structure: src/components/<name>/{component.ts, component.css,
  component.test.ts, types.ts, events.ts (only if it dispatches events),
  controller.ts (only if it needs a reactive controller)}.
- Styling: CSS custom properties only (--tk-*), from @tokotuku/theme —
  never a hardcoded color/spacing/radius/shadow/duration/font value.
- component.css is a separate file, imported as
  `import styles from "./component.css?raw"` and attached via
  `static override styles = unsafeCSS(styles)`. Works natively in Vite/Vitest;
  the tsup library build needs `loader: { ".css": "text" }` in the package's
  tsup.config.ts (already set in packages/elements/tsup.config.ts) — do NOT
  write a custom esbuild plugin for this, tsup's own postcss-based CSS
  handling claims `.css`-suffixed paths before any user esbuildPlugins get a
  chance, so a custom plugin silently loses the race and produces `{}`.

CRITICAL — no decorators, despite the repo's TypeScript being configured for
TC39 stage-3 decorators (`useDefineForClassFields: true`, no
`experimentalDecorators`): Vite 8's default transform (Oxc/Rolldown) cannot
parse ANY class or field decorator yet (confirmed by testing — it rejects
even a bare `@customElement(...)` with no other decorator involved), which
breaks Vitest for every component. Do not use `@customElement`, `@property`,
`@state`, `@query` from `lit/decorators.js`. Instead:
- Register with `customElements.define(tagName("x"), TkX)` after the class
  body, not `@customElement`.
- Declare reactive properties via `static override properties = { foo: {
  type: String, reflect: true }, ... }` (note: `override`, since LitElement
  already declares a static `properties` field, and `noImplicitOverride` is
  on) plus a matching `declare foo: Type;` field per property (no initializer
  — TypeScript would otherwise emit a shadowing own-property that clobbers
  Lit's generated accessor). Set actual defaults in the constructor after
  `super()`.
- `static override styles = unsafeCSS(styles);` also needs `override`.
- Override any LitElement lifecycle method (`render()`, `focus()`, etc.) with
  the `override` keyword.
Look at packages/elements/src/components/button/component.ts,
input/component.ts, and card/component.ts for the exact working pattern
before writing a new component — copy the shape, don't reinvent it.

`@tokotuku/astro` wrappers: props forwarded as attributes on the underlying
`tk-*` element; a wrapper's client-side registration goes in a template
`<script>import "@tokotuku/elements/x";</script>`, never a frontmatter
import (frontmatter runs server-side during SSR, where `customElements`
doesn't exist). For boolean props, never pass a bare `false` — Astro can
render `disabled={false}` as the *present* attribute `disabled=""` on a
custom (non-native) element, which Lit's Boolean property converter then
reads as `true`. Always use `disabled={disabled ? true : undefined}`.

Package manager is Bun (`workspace:*` for internal deps). Task runner is
Moon — `bun run build|test|typecheck|lint` at the repo root runs every
package's task via `moon run :<task>`. `bun run format` applies Biome
formatting repo-wide. biome.json excludes `apps/example` entirely and has a
`**/*.astro` override disabling `correctness.noUnusedVariables` (Biome only
lints an .astro file's frontmatter script in isolation, so it can't see that
a destructured prop is used in the template below it — false positive
otherwise).

Verification standard for this repo: typecheck/build/lint/unit-test passing
is not sufficient proof a UI change works — an Astro compiler bug was found
during this project where `disabled={false}` rendered as present-not-omitted
on a custom element, silently breaking a button, and every automated check
was green. Actually launch the app (`astro dev --background` per each app's
AGENTS.md/CLAUDE.md) and click through the real flow before calling
something done.
```

---

## Prompt 1 — Implement `tokotuku create component` (do this first)

```
Implement the `create component` command in packages/cli
(packages/cli/src/commands/create-component.ts currently just prints "not
implemented yet" and exits non-zero — see packages/cli/src/commands/
not-implemented.ts for the current stub pattern, and packages/cli/src/cli.ts
for how commands are wired up).

Goal: `tokotuku create component <name>` scaffolds a new tk-* component under
packages/elements/src/components/<name>/ that exactly matches the
established pattern — read packages/elements/src/components/button/*.ts,
input/*.ts, and card/*.ts first (see the shared context above for the
no-decorators constraint) and generate files with that same shape:

- component.ts — LitElement subclass, static override styles = unsafeCSS
  (import from "./component.css?raw"), static override properties + matching
  `declare` fields if the component takes props (ask/default to none for a
  bare scaffold — let the developer add properties after), constructor
  setting defaults, render() returning a minimal template, and
  `customElements.define(tagName("<name>"), TkX)` at the bottom, plus the
  `declare global { interface HTMLElementTagNameMap { ... } }` block.
- component.css — empty rule block with a comment reminding to only use
  --tk-* custom properties.
- component.test.ts — a fixture()/cleanupFixtures() smoke test from
  @tokotuku/testing asserting the tag registers (mirror
  packages/elements/src/components/card/component.test.ts's structure).
- types.ts — only created if the component will have typed props; otherwise
  skip it (button/input have one, card doesn't — match that judgment call).

Also scaffold the matching packages/astro wrapper (TkX.astro under
packages/astro/src/components/), following packages/astro/src/components/
TkButton.astro and TkCard.astro as the reference: props typed in
packages/astro/src/types.ts, template `<script>import
"@tokotuku/elements/<name>";</script>`, boolean props using the `cond ? true
: undefined` pattern from the shared context.

Update package.json `exports` in both packages/elements (add `./<name>`
pointing at dist/<name>.js + dist/<name>.d.ts) and packages/astro (add
`./TkX.astro`), and add `<name>: "src/components/<name>/component.ts"` to
the `entry` map in packages/elements/tsup.config.ts.

Decide and implement a sensible CLI UX: at minimum `tokotuku create
component <name>` (kebab-case name required, validate it), print what files
were created, exit 0. Consider (your call, use judgment) whether to prompt
for "does this need a types.ts / events.ts / does it register any custom
event" or just always scaffold the minimal shape and let the developer add
what's missing — bias toward the simpler, more predictable option since this
tool will be used by other engineers, not just by an agent.

Update packages/cli/README.md's status table (currently says "not yet
implemented" for this command) and remove the "create component needs the
component.css build strategy resolved first" blocker note from
packages/cli/README.md's Status section — that decision is already made
(see shared context).

Verify by actually running `tokotuku create component tooltip` (or via `bun
run --cwd packages/cli dev` / building the CLI first per its README) against
a real throwaway component name, then running `bun run build && bun run
test && bun run typecheck && bun run lint` at the repo root to confirm the
generated files compile and pass cleanly — this is the real acceptance test,
not just that the generator ran without throwing. Delete the throwaway
component afterward unless asked to keep it.
```

---

## Prompt 2 — Expand the component inventory

```
Add the next batch of tk-* components to packages/elements (and matching
packages/astro wrappers), using the `tokotuku create component <name>` CLI
from packages/cli if it's implemented (see the shared context — check
packages/cli/README.md's status table first), otherwise follow the manual
pattern in packages/elements/src/components/button|input|card/ exactly.

Priority order (build in this order, stop and check in with whoever's
running this session before continuing past checkbox/select if scope needs
to shrink):

1. tk-checkbox — props: checked (Boolean, reflect), disabled (Boolean,
   reflect), label (String), name (String), value (String). Dispatch
   `tk-change` with { checked: boolean } detail via TypedEvent, same pattern
   as tk-input's events.ts.
2. tk-select — props: label, name, value, disabled, required. Slot for
   <option>-like children, or (your call) a `options: {label,value}[]`
   property — look at how native <select> vs a custom listbox tradeoff plays
   out for accessibility before picking; document the decision in the
   component's own README.md if you add one.
3. tk-textarea — same shape as tk-input but multi-line; consider whether it
   should share code with tk-input via a controller (packages/core has
   precedent for reactive controllers) rather than duplicating the
   label/value/tk-change logic — your call, don't force an abstraction if
   the two components diverge enough that sharing adds more complexity than
   it saves.
4. tk-badge — presentational only, like tk-card. Props: variant (e.g.
   neutral/success/warning/danger, matching the semantic colors already in
   packages/theme/src/palettes/light.ts: --tk-color-success/-warning/
   -danger).
5. tk-modal / tk-dialog — the first genuinely stateful/interactive one:
   needs open/close, focus trapping, Escape-to-close, and ideally uses the
   native <dialog> element under the hood for free focus-trap +
   top-layer behavior rather than reimplementing it. Dispatch tk-open/
   tk-close events. This is the highest-risk one for scope creep — timebox
   it and ship a minimal version (open/close + a slot) rather than a fully
   featured one on the first pass.

For each component: write the CSS using only --tk-* custom properties
(check packages/theme/src/tokens.ts and palettes/light.ts for what's
available; if a token category you need doesn't exist as a CSS var yet,
that's a real gap — extend packages/theme the same way tokens.ts already
does for spacing/radius/shadow/duration/typography, don't hardcode a value
as a workaround).

After each component, actually mount it in apps/playground (or apps/example
if playground isn't wired up yet — see Prompt 3) and look at it — a
component that only passes `bun run test` has not been verified visually,
and this repo has already hit at least one bug (an Astro boolean-attribute
quirk) that only showed up when actually clicked in a browser. Screenshot
each new component in at least two states (default + one interactive state
like :focus-visible or checked/open) before considering it done.

Run `bun run build && bun run test && bun run typecheck && bun run lint` at
the repo root after each component, not just at the end — catching a broken
convention early is cheaper than untangling five components' worth of the
same mistake.
```

---

## Prompt 3 — Wire up apps/playground for live component preview

```
apps/playground (a plain Vite app — check apps/playground/index.html,
src/main.ts, vite.config.ts, package.json for current state; it's NOT Astro,
so there's no SSR/frontmatter concern here, `import "@tokotuku/elements/x"`
works directly at module top level) is currently an empty shell. Turn it
into a real manual testing ground for every tk-* component.

Goal: one page (or one route per component, your call based on how
apps/playground/index.html is currently structured — check whether it's a
single-page app or has room for multiple entries) that mounts every
component from packages/elements in a few representative states (default,
disabled, each variant/size if applicable, a slotted example for card-like
components), styled with the real Tokotuku UI theme (import themeCss from
@tokotuku/theme the same way apps/example/src/layouts/Layout.astro does —
inject as a <style> tag, or for a plain Vite app, into an actual .css file
imported normally since there's no Astro `set:html` trick needed/available
here).

Add a light/dark/high-contrast theme switcher (packages/theme exports
lightCss/darkCss/highContrastCss and the palettes are keyed by
[data-theme="..."] on :root — see packages/theme/src/index.ts) so visual
regressions across themes are easy to catch by eye, not just by reading CSS.

This does NOT need to be polished/productized — it's a dev tool. Prioritize
"every component is visible and interactive in under a few seconds of
`bun run dev`" over any kind of design of the playground itself.

Wire apps/playground/package.json to depend on @tokotuku/elements
(workspace:*) directly — no need for @tokotuku/astro here since this isn't
Astro.

Verify by running `bun run --cwd apps/playground dev`, actually opening it
in a browser (or via the same Playwright-driven screenshot approach used to
verify apps/example in this project's history — launch headless chromium,
navigate, screenshot), and confirming every existing component
(button/input/card, plus anything Prompt 2 added) renders without console
errors in both light and dark theme.
```

---

## Prompt 4 — Extract a reusable auth pattern from apps/example

```
apps/example (Astro on Cloudflare Workers + D1) has a working Better Auth
integration: apps/example/src/lib/auth.ts (createAuth(env, baseURL) factory
building a fresh betterAuth() instance per request, database: env.DB passed
directly — better-auth 1.6.x has native Cloudflare D1 support, no
kysely-d1/kysely dependency needed), apps/example/src/lib/auth-client.ts
(browser-side createAuthClient()), apps/example/src/pages/api/auth/
[...all].ts (the catch-all Astro API route), apps/example/migrations/
0001_create_auth_tables.sql (Better Auth's core schema: user/session/
account/verification tables), and apps/example/src/pages/login.astro +
register.astro (forms built from tk-input + tk-button, driven entirely by
client-side <script> tags calling authClient.signIn.email/signUp.email —
deliberately not using a native <form> submit, since tk-button doesn't
implement ElementInternals form-association, see the component's source for
why).

Important: `createAuth`'s `baseURL` is derived from the incoming request's
own origin (`Astro.url.origin` / `new URL(request.url).origin`), NOT a fixed
env var — a hardcoded baseURL broke with a 403 "Invalid origin" the moment
`astro dev` picked a non-default port. Preserve this pattern in whatever you
extract.

This is currently a one-off, redone-from-scratch-if-needed integration.
Decide (this is a real architectural call, worth writing a short plan and
getting sign-off before implementing, per this repo's convention of using
Plan mode for non-trivial multi-file work) between:

(a) A new `@tokotuku/auth` package: exports the createAuth() factory
    pattern (parameterized, since it can't hardcode env/D1 binding names),
    the migration SQL as a template/generator, and maybe tk-login-form /
    tk-register-form components (or keep those as plain compositions of
    tk-input + tk-button in each consuming app — a full form component
    might be premature abstraction for two fields).
(b) A documented recipe/template (e.g. under apps/docs, or a
    `packages/cli` `generate` subcommand) that scaffolds the same set of
    files into a new app rather than sharing runtime code — since the
    D1 binding, table names, and env var names are inherently
    per-application.

Whichever you pick, the test is: could a second Cloudflare+Astro app in this
monorepo get working login/register in under 10 minutes using what you
build, without re-deriving any of the D1/Better-Auth integration details
that took real trial-and-error in apps/example (native D1Database support
vs. kysely-d1, the exact core schema column names/types, the baseURL-from-
request-origin fix)? Verify by actually building a minimal second
app/route using it, not just by reading the code.
```

---

## Prompt 5 — Cloudflare + Astro app scaffold/generator

```
apps/example is a working reference for "Astro on Cloudflare Workers + D1 +
R2", but every gotcha hit while building it is currently only documented in
prose (apps/example/README.md) or living implicitly in its config files.
Turn it into a repeatable scaffold so the next Cloudflare+Astro app in this
monorepo (or a real product app outside it) doesn't have to rediscover:

- Binding name collisions: @astrojs/cloudflare auto-enables a Cloudflare
  Images optimization binding defaulting to the name "IMAGES" — any R2
  bucket binding also named "IMAGES" collides. (apps/example uses
  PRODUCT_IMAGES.)
- wrangler.jsonc's `main` field must be the bare specifier
  `@astrojs/cloudflare/entrypoints/server`, not a literal dist path —
  @cloudflare/vite-plugin validates `main` exists on disk before build if it
  looks like a file path, causing a chicken-and-egg failure otherwise.
  `assets.directory` must be `./dist/client`, not `./dist`.
- `Astro.locals.runtime.env` is removed in this adapter version — use
  `import { env } from "cloudflare:workers"` in pages/API routes instead;
  the global `Env` type comes from `wrangler types` (the `cf-typegen`
  script) with no manual `env.d.ts` Locals augmentation needed.
- Local dev is fully offline via `platformProxy: { enabled: true }` in
  astro.config.mjs's cloudflare() adapter options plus `wrangler d1/r2 ...
  --local`; `.wrangler/state/` holds all local D1/R2/KV state.
- Migrations pattern: `migrations/NNNN_description.sql`, applied via
  `wrangler d1 migrations apply DB --local|--remote`
  (see apps/example/package.json's db:migrate:local/remote scripts).
- Secrets go in a gitignored `.dev.vars` for local dev,
  `wrangler secret put` for a real deploy — never in wrangler.jsonc `vars`
  (that's for non-secret config only).

Decide (your call, small enough not to need a separate plan/sign-off unless
scope grows) whether this becomes:
(a) A `tokotuku generate app` or similar packages/cli command that
    scaffolds a new apps/<name> directory from a template, or
(b) A literal template directory (e.g. templates/cloudflare-astro-app/)
    copied and customized manually, documented in the root README's
    workspace layout section.

Whichever you pick, prove it works by actually scaffolding a second,
throwaway Cloudflare+Astro app with it, running through the same local-dev
checklist apps/example/README.md documents (cf-typegen, db:migrate:local,
astro dev --background), confirming it serves successfully, and only then
deleting the throwaway app (unless asked to keep it as a second real
example).
```
