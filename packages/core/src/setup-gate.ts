export type SetupGateCheck = () => Promise<boolean>;

let setupGateCheck: SetupGateCheck | null = null;

/**
 * Registers the one-time "has the first admin been created yet" check that
 * gates every route behind /setup until it passes. A client with no such
 * bootstrap flow (e.g. a pure content site) never calls this — the
 * middleware then skips the gate entirely rather than defaulting to some
 * assumed state.
 */
export function registerSetupGate(check: SetupGateCheck): void {
  setupGateCheck = check;
}

/** Returns null when no gate is registered — distinct from a registered gate returning false. */
export async function checkSetupGate(): Promise<boolean | null> {
  if (!setupGateCheck) return null;
  return setupGateCheck();
}

/** Test-only: clears the registered gate so suites don't leak state between runs. */
export function resetSetupGate(): void {
  setupGateCheck = null;
}
