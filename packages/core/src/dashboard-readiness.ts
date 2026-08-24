export type DashboardReadinessStepId = "admin" | "brand" | "logo";

export interface DashboardReadinessInput {
  hasAuthenticatedAdmin: boolean;
  brandName: string;
  hasLogo: boolean;
  /** Kept optional for callers upgrading from the module-aware API; core never reads it. */
  moduleNames?: readonly string[];
}

export interface DashboardReadinessStep {
  id: DashboardReadinessStepId;
  complete: boolean;
}

export interface DashboardReadiness {
  steps: DashboardReadinessStep[];
  completed: number;
  total: 3;
  percentage: number;
}

/**
 * Computes launch readiness from configuration that core can safely observe.
 * Optional modules own their business data; core deliberately does not query it.
 */
export function calculateDashboardReadiness(input: DashboardReadinessInput): DashboardReadiness {
  const normalizedBrandName = input.brandName.trim().toLocaleLowerCase();
  const steps: DashboardReadinessStep[] = [
    { id: "admin", complete: input.hasAuthenticatedAdmin },
    {
      id: "brand",
      complete: Boolean(normalizedBrandName) && normalizedBrandName !== "karsa",
    },
    { id: "logo", complete: input.hasLogo },
  ];
  const completed = steps.filter((step) => step.complete).length;

  return {
    steps,
    completed,
    total: 3,
    percentage: Math.round((completed / 3) * 100),
  };
}
