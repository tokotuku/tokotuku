/**
 * Equivalent to `parent.append(...children)`, built on `appendChild`
 * instead. `wrangler types` declares a global HTMLRewriter `interface
 * Element` that merges with lib.dom's `Element` and leaves `.append()`
 * with an incompatible overload project-wide — `appendChild` isn't a name
 * HTMLRewriter's Element also declares, so it sidesteps the collision.
 */
export function appendAll(parent: Node, ...children: (Node | string)[]): void {
  for (const child of children) {
    parent.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
}
