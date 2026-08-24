import type { D1Database, D1PreparedStatement } from "@cloudflare/workers-types";

export interface OrderLineItem {
  itemId: number;
  quantity: number;
}

export interface OrderCreateContext {
  db: D1Database;
  orderNumber: string;
  items: OrderLineItem[];
  /**
   * Module-owned, order-creation-time data no hook could otherwise see —
   * e.g. `attributes.booking` carries the requested date range so
   * `@karsa/booking`'s hook can write `booking_order_bookings` in the
   * same atomic batch. Keyed by module name so unrelated hooks never
   * collide; a hook that doesn't recognize its key just returns [].
   */
  attributes?: Record<string, unknown>;
}

export type OrderCreateHook = (ctx: OrderCreateContext) => D1PreparedStatement[];

export interface OrderStatusChangeContext {
  db: D1Database;
  orderId: number;
  previousStatus: string;
  nextStatus: string;
  items: OrderLineItem[];
}

export type OrderStatusChangeHook = (ctx: OrderStatusChangeContext) => D1PreparedStatement[];

const createHooks = new Set<OrderCreateHook>();
const statusChangeHooks = new Set<OrderStatusChangeHook>();

/**
 * Registers a hook that contributes extra statements to the same atomic
 * batch as an order's creation (e.g. decrementing stock). A module that
 * isn't installed never calls this, so its statements are simply absent —
 * no flag, no branching in @karsa/orders.
 */
export function onOrderCreate(hook: OrderCreateHook): void {
  createHooks.add(hook);
}

export function onOrderStatusChange(hook: OrderStatusChangeHook): void {
  statusChangeHooks.add(hook);
}

export function collectOrderCreateStatements(ctx: OrderCreateContext): D1PreparedStatement[] {
  return [...createHooks].flatMap((hook) => hook(ctx));
}

export function collectOrderStatusChangeStatements(
  ctx: OrderStatusChangeContext,
): D1PreparedStatement[] {
  return [...statusChangeHooks].flatMap((hook) => hook(ctx));
}

/** Test-only: clears registered hooks so suites don't leak state between runs. */
export function resetOrderHooks(): void {
  createHooks.clear();
  statusChangeHooks.clear();
}

export class ConstraintViolationError extends Error {
  constructor(
    public readonly constraint: string,
    message: string,
  ) {
    super(message);
    this.name = "ConstraintViolationError";
  }
}

const CHECK_CONSTRAINT_PATTERN = /CHECK constraint failed:\s*([^:]+)/;

/**
 * Maps a raw D1/SQLite error to a typed one. A CHECK constraint failure
 * (e.g. the inventory module's `on_hand >= 0`) becomes a
 * ConstraintViolationError callers can branch on, instead of every caller
 * re-deriving its own string match against the driver's error text.
 */
export function mapD1Error(error: unknown): Error {
  if (error instanceof Error) {
    const match = CHECK_CONSTRAINT_PATTERN.exec(error.message);
    const constraint = match?.[1]?.trim();
    if (constraint) return new ConstraintViolationError(constraint, error.message);
    return error;
  }
  return new Error(String(error));
}
