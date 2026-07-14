const mountedElements = new Set<Element>();

export function fixture<T extends Element = HTMLElement>(html: string): T {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  const element = template.content.firstElementChild;

  if (!element) {
    throw new Error("fixture() received markup with no root element");
  }

  document.body.append(element);
  mountedElements.add(element);
  return element as T;
}

export function cleanupFixtures(): void {
  for (const element of mountedElements) {
    element.remove();
  }
  mountedElements.clear();
}
