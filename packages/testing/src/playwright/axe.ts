import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import type { Result } from "axe-core";

export async function expectNoAccessibilityViolations(
  page: Page,
  selector?: string,
): Promise<void> {
  const builder = new AxeBuilder({ page });
  const results = selector ? await builder.include(selector).analyze() : await builder.analyze();

  if (results.violations.length > 0) {
    throw new Error(formatViolations(results.violations));
  }
}

function formatViolations(violations: readonly Result[]): string {
  return violations
    .map(
      (violation) =>
        `${violation.id}: ${violation.help} (${violation.nodes.map((node) => JSON.stringify(node.target)).join(", ")})`,
    )
    .join("\n");
}
