# @tokotuku/core

Framework-agnostic utilities that `@tokotuku/elements` builds on. Zero UI — no Lit, no Shadow DOM, no components.

## Overview

| Module | Exports | Purpose |
| --- | --- | --- |
| `dom/is-focusable` | `isFocusable`, `FOCUSABLE_SELECTOR` | Determine whether an element is focusable (disabled/aria-disabled/tabindex/visibility aware) |
| `dom/query-focusable` | `queryFocusable` | Find all focusable descendants of a root, in document order |
| `keyboard/keys` | `Keys`, `Key`, `isKey` | Named keyboard key constants and a match helper |
| `animation/reduced-motion` | `prefersReducedMotion` | Read the user's `prefers-reduced-motion` preference |
| `events/typed-event` | `TypedEvent`, `TypedEventInit` | A `CustomEvent` subclass with a required, typed `detail` and shadow-crossing defaults (`bubbles: true`, `composed: true`) |

## Installation

```sh
bun add @tokotuku/core
```

## Usage

```ts
import { isFocusable, queryFocusable, Keys, isKey, TypedEvent } from "@tokotuku/core";

interface TkChangeDetail {
  value: string;
}

element.addEventListener("keydown", (event) => {
  if (isKey(event, Keys.Escape)) {
    element.dispatchEvent(new TypedEvent<TkChangeDetail>("tk-close", { detail: { value: "" } }));
  }
});
```

## Trade-offs / future work

Stateful controllers implied by the brief — a focus trap, an overlay stack manager, a roving-tabindex controller — are **not yet implemented**. Their correct shape depends on the interaction contract of the first component that needs one (a dialog, a menu). Building them ahead of that real usage risks an API that doesn't fit and needs reworking. Add each controller alongside the component that first requires it, backed by `dom/query-focusable` and `keyboard/keys`.

`queryFocusable` is light-DOM only — it does not pierce into nested shadow roots. Revisit if a component needs to trap focus across a shadow boundary it doesn't own.
