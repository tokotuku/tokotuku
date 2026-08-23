export type DashboardReadinessStepId = "admin" | "brand" | "logo" | "catalog" | "orders";

export interface DashboardReadinessInput {
  hasAuthenticatedAdmin: boolean;
  brandName: string;
  hasLogo: boolean;
  moduleNames: readonly string[];
}

export interface DashboardReadinessStep {
  id: DashboardReadinessStepId;
  complete: boolean;
}

export interface DashboardReadiness {
  steps: DashboardReadinessStep[];
  completed: number;
  total: 5;
  percentage: number;
}

/**
 * Computes launch readiness from configuration that core can safely observe.
 * Optional modules own their business data; core deliberately does not query it.
 */
export function calculateDashboardReadiness(input: DashboardReadinessInput): DashboardReadiness {
  const normalizedBrandName = input.brandName.trim().toLocaleLowerCase();
  const installedModules = new Set(
    input.moduleNames.map((moduleName) => moduleName.trim().toLocaleLowerCase()),
  );
  const hasModule = (needle: string) =>
    [...installedModules].some((moduleName) => moduleName.includes(needle));
  const steps: DashboardReadinessStep[] = [
    { id: "admin", complete: input.hasAuthenticatedAdmin },
    {
      id: "brand",
      complete: Boolean(normalizedBrandName) && normalizedBrandName !== "takontuku",
    },
    { id: "logo", complete: input.hasLogo },
    { id: "catalog", complete: hasModule("catalog") },
    { id: "orders", complete: hasModule("orders") },
  ];
  const completed = steps.filter((step) => step.complete).length;

  return {
    steps,
    completed,
    total: 5,
    percentage: completed * 20,
  };
}
