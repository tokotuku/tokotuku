# @tokotuku/testing

Shared Vitest fixture and Playwright accessibility helpers, so every component's `component.test.ts`/`component.spec.ts` starts from the same primitives instead of reinventing DOM mounting or a11y assertions.

## Overview

| Export | From | Purpose |
| --- | --- | --- |
| `fixture(html)` | `@tokotuku/testing` | Mounts an HTML string into `document.body`, returns the root element |
| `cleanupFixtures()` | `@tokotuku/testing` | Removes every element mounted via `fixture()` — call from `afterEach` |
| `expectNoAccessibilityViolations(page, selector?)` | `@tokotuku/testing/playwright` | Runs axe-core against a page (or a scoped selector) and throws with a readable report if any violations are found |

The Playwright helper is a separate entry point (`@tokotuku/testing/playwright`) so importing `@tokotuku/testing` for a plain Vitest unit test doesn't pull in `@axe-core/playwright` or Playwright's types.

## Installation

```sh
bun add -D @tokotuku/testing
```

## Usage

```ts
// component.test.ts (Vitest)
import { afterEach, describe, expect, it } from "vitest";
import { cleanupFixtures, fixture } from "@tokotuku/testing";

afterEach(cleanupFixtures);

it("renders", () => {
  const el = fixture("<tk-button>Click me</tk-button>");
  expect(el.textContent).toBe("Click me");
});
```

```ts
// component.spec.ts (Playwright)
import { test } from "@playwright/test";
import { expectNoAccessibilityViolations } from "@tokotuku/testing/playwright";

test("has no accessibility violations", async ({ page }) => {
  await page.goto("/components/button");
  await expectNoAccessibilityViolations(page);
});
```

## Trade-offs / future work

- No auto-wired Vitest `setupFiles` convention yet (e.g. automatic `afterEach(cleanupFixtures)`) — call `cleanupFixtures` explicitly for now. Revisit once several components share the exact same setup boilerplate.
- No Playwright fixtures for navigating to a component's demo page yet, since `apps/playground` has no real per-component pages to navigate to.
