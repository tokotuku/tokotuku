export function toCssCustomProperties(
  selector: string,
  values: Record<string, string>,
  prefix = "tk",
): string {
  const lines = Object.entries(values).map(([name, value]) => `  --${prefix}-${name}: ${value};`);
  return `${selector} {\n${lines.join("\n")}\n}`;
}
