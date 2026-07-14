import { FOCUSABLE_SELECTOR, isFocusable } from "./is-focusable.js";

/** Light-DOM only — does not pierce into nested shadow roots. */
export function queryFocusable(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isFocusable);
}
