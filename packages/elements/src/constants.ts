export const ELEMENT_PREFIX = "tk" as const;

export function tagName(name: string): `${typeof ELEMENT_PREFIX}-${string}` {
  return `${ELEMENT_PREFIX}-${name}`;
}

export function eventName(name: string): `${typeof ELEMENT_PREFIX}-${string}` {
  return `${ELEMENT_PREFIX}-${name}`;
}
