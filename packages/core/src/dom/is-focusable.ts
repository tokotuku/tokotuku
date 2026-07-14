export const FOCUSABLE_SELECTOR =
  'a[href], button, input, select, textarea, [tabindex], audio[controls], video[controls], summary, iframe, [contenteditable]:not([contenteditable="false"])';

export function isFocusable(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  if (element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true") {
    return false;
  }

  const tabIndexAttr = element.getAttribute("tabindex");
  if (tabIndexAttr !== null && Number(tabIndexAttr) < 0) {
    return false;
  }

  if (!element.matches(FOCUSABLE_SELECTOR)) {
    return false;
  }

  const { display, visibility } = getComputedStyle(element);
  return display !== "none" && visibility !== "hidden";
}
