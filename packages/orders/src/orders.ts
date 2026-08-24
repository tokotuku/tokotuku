import type { D1Database } from "@cloudflare/workers-types";
import { findItemById, findItemsByIds } from "@karsa/catalog";
import {
  assertCursor,
  ConstraintViolationError,
  CursorError,
  type CursorPage,
  collectOrderCreateStatements,
  collectOrderStatusChangeStatements,
  cursorFilterSignature,
  encodeCursor,
  mapD1Error,
  normalizePageSize,
} from "@karsa/core";

// `pending`..`delivered` is the original checkout-and-ship lifecycle.
// `inquiry`..`in_progress`..`completed` is the lead-and-fulfill lifecycle a
// module like @karsa/booking creates orders into via createInquiryOrder
// — a request has no total until an admin quotes it, and "delivered" (a
// shipment concept) doesn't fit a finished visit or service. Both lifecycles
// share `confirmed` as their convergence point and `cancelled` as their exit.
export const orderStatuses = [
  "inquiry",
  "quoted",
  "pending",
  "confirmed",
  "in_progress",
  "delivered",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof orderStatuses)[number];

/**
 * Legal next statuses for each current status — the "transisi legalnya"
 * @karsa/orders is responsible for exporting alongside the vocabulary
 * itself (no CHECK on orders.status: SQLite can't ALTER a CHECK in place,
 * so legality lives here, in TypeScript, where it can actually change).
 * A status mapped to [] is terminal: nothing, including re-selecting the
 * same value, is a legal move out of it.
 */
export const orderTransitions: Record<OrderStatus, OrderStatus[]> = {
  inquiry: ["quoted", "confirmed", "cancelled"],
  quoted: ["confirmed", "cancelled"],
  pending: ["confirmed", "cancelled"],
  confirmed: ["in_progress", "delivered", "completed", "cancelled"],
  in_progress: ["completed", "cancelled"],
  delivered: [],
  completed: [],
  cancelled: [],
};

function generateOrderNumber(): string {
  return `KR-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

export const paymentMethods = ["cash", "transfer"] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export interface CheckoutDetails {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  city: string;
  postalCode: string;
  note: string;
}

export interface CartLineInput {
  id: number;
  quantity: number;
}

export interface AdminOrder {
  id: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  createdAt: string;
  itemCount: number;
  /** NULL for an order that hasn't been quoted yet — see createInquiryOrder. */
  totalCents: number | null;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: "unpaid" | "paid";
  paymentProofKey: string | null;
}

export interface AdminOrderItem {
  itemId: number;
  productName: string;
  sku: string;
  priceCents: number;
  quantity: number;
  lineTotalCents: number | null;
}

export interface AdminOrderDetail extends AdminOrder {
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  customerNote: string;
  source: string;
  items: AdminOrderItem[];
}

export interface OrderDashboardSummary {
  todaySalesCents: number;
  thirtyDayRevenueCents: number;
  pendingCount: number;
  transferPendingCount: number;
  statusCounts: Record<OrderStatus, number>;
  recentOrders: AdminOrder[];
}

export interface ListOrdersOptions {
  status?: OrderStatus;
  search?: string;
  pageSize?: number;
  after?: string;
  before?: string;
}

function normalizeCart(cart: CartLineInput[]) {
  const quantities = new Map<number, number>();
  for (const item of cart) {
    const id = Math.trunc(Number(item.id));
    const quantity = Math.trunc(Number(item.quantity));
    if (id > 0 && quantity > 0 && quantity <= 99) {
      quantities.set(id, (quantities.get(id) ?? 0) + quantity);
    }
  }
  return [...quantities].map(([id, quantity]) => ({ id, quantity }));
}

export async function createOrder(
  db: D1Database,
  userId: string,
  details: CheckoutDetails,
  rawCart: CartLineInput[],
  paymentMethod: PaymentMethod,
) {
  const cart = normalizeCart(rawCart);
  if (!cart.length) throw new Error("Keranjang belanja kosong.");

  const foundProducts = await findItemsByIds(
    db,
    cart.map((item) => item.id),
  );
  if (foundProducts.length !== cart.length)
    throw new Error("Ada produk yang sudah tidak tersedia.");
  const products = new Map(foundProducts.map((product) => [product.id, product]));
  for (const item of cart) {
    const product = products.get(item.id);
    if (!product || product.stock < item.quantity) {
      throw new Error(`Stok ${product?.name ?? "produk"} tidak mencukupi.`);
    }
  }

  let subtotalCents = 0;
  for (const item of cart) {
    const product = products.get(item.id);
    if (!product) throw new Error("Ada produk yang sudah tidak tersedia.");
    if (product.priceCents === null)
      throw new Error("Produk tanpa harga tidak dapat masuk checkout.");
    subtotalCents += product.priceCents * item.quantity;
  }
  const orderNumber = generateOrderNumber();

  const statements = [
    db
      .prepare(
        `INSERT INTO orders
          (order_number, source, user_id, customer_name, customer_email, customer_phone, shipping_address,
           shipping_city, shipping_postal_code, customer_note, subtotal_cents, total_cents)
         VALUES (?, 'web', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        orderNumber,
        userId,
        details.customerName,
        details.customerEmail,
        details.customerPhone,
        details.address,
        details.city,
        details.postalCode,
        details.note,
        subtotalCents,
        subtotalCents,
      ),
    ...cart.map((item) => {
      const product = products.get(item.id);
      if (!product) throw new Error("Ada produk yang sudah tidak tersedia.");
      if (product.priceCents === null)
        throw new Error("Produk tanpa harga tidak dapat masuk checkout.");
      return db
        .prepare(
          `INSERT INTO order_items
            (order_id, item_id, product_name, sku, price_cents, quantity, line_total_cents)
           VALUES ((SELECT id FROM orders WHERE order_number = ?), ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          orderNumber,
          product.id,
          product.name,
          product.sku,
          product.priceCents,
          item.quantity,
          product.priceCents * item.quantity,
        );
    }),
  ];

  if (paymentMethod === "transfer") {
    statements.push(
      db
        .prepare(
          "INSERT INTO payments_bank_transfer_proofs (order_id) VALUES ((SELECT id FROM orders WHERE order_number = ?))",
        )
        .bind(orderNumber),
    );
  }

  const hookStatements = collectOrderCreateStatements({
    db,
    orderNumber,
    items: cart.map((item) => ({ itemId: item.id, quantity: item.quantity })),
  });

  try {
    await db.batch([...statements, ...hookStatements]);
  } catch (error) {
    const mapped = mapD1Error(error);
    if (mapped instanceof ConstraintViolationError) {
      throw new Error("Stok berubah saat checkout. Periksa keranjang lalu coba lagi.");
    }
    throw mapped;
  }

  return { orderNumber, totalCents: subtotalCents };
}

export interface InquiryDetails {
  customerName: string;
  customerPhone: string;
  /** Optional — a WhatsApp-first lead may give only a phone number. */
  customerEmail?: string;
  /** Where the service happens. Stored in shipping_address; nothing ships. */
  serviceAddress: string;
  note?: string;
  /** Lead channel, for reporting. Defaults to 'web' since this is normally called from a storefront form POST. */
  source?: string;
}

/**
 * Creates an order for a single catalog item with no computed total and no
 * signed-in user — the entry point for a lead that hasn't been quoted yet
 * (a scheduling request from @karsa/booking, a project inquiry, or any
 * future channel that isn't "add to cart and pay now"). Neighbor to
 * createOrder, not a replacement: physical checkout keeps using createOrder.
 *
 * subtotal_cents/total_cents stay NULL rather than being computed from
 * priceCents × some multiplier — this function has no idea what that
 * multiplier would even mean (days? occurrences? a flat quote?), and
 * guessing would print a price nobody quoted. An admin fills in the real
 * total when they quote the order.
 */
export async function createInquiryOrder(
  db: D1Database,
  itemId: number,
  details: InquiryDetails,
  attributes?: Record<string, unknown>,
): Promise<{ orderNumber: string }> {
  const product = await findItemById(db, itemId, { presentation: "services" });
  if (!product) throw new Error("Layanan yang diminta sudah tidak tersedia.");

  const orderNumber = generateOrderNumber();
  const statements = [
    db
      .prepare(
        `INSERT INTO orders
          (order_number, source, user_id, customer_name, customer_email, customer_phone,
           shipping_address, shipping_city, shipping_postal_code, customer_note,
           subtotal_cents, total_cents, status)
         VALUES (?, ?, NULL, ?, ?, ?, ?, '', '', ?, NULL, NULL, 'inquiry')`,
      )
      .bind(
        orderNumber,
        details.source ?? "web",
        details.customerName,
        details.customerEmail ?? null,
        details.customerPhone,
        details.serviceAddress,
        details.note ?? "",
      ),
    // price_cents is an honest snapshot of the item's listed rate — useful
    // reference for whoever quotes the order. line_total_cents stays NULL
    // for the same reason subtotal/total do on the order itself.
    db
      .prepare(
        `INSERT INTO order_items
          (order_id, item_id, product_name, sku, price_cents, quantity, line_total_cents)
         VALUES ((SELECT id FROM orders WHERE order_number = ?), ?, ?, ?, ?, 1, NULL)`,
      )
      .bind(orderNumber, product.id, product.name, product.sku, product.priceCents),
  ];

  const hookStatements = collectOrderCreateStatements({
    db,
    orderNumber,
    items: [{ itemId: product.id, quantity: 1 }],
    // exactOptionalPropertyTypes: an explicit `attributes: undefined` is not
    // the same as the property being absent — only include the key at all
    // when there's a real value.
    ...(attributes ? { attributes } : {}),
  });

  try {
    await db.batch([...statements, ...hookStatements]);
  } catch (error) {
    throw mapD1Error(error);
  }

  return { orderNumber };
}

export async function findCustomerOrder(db: D1Database, orderNumber: string, userId: string) {
  return db
    .prepare(
      `SELECT o.order_number AS orderNumber, o.total_cents AS totalCents, o.status,
              CASE WHEN p.order_id IS NULL THEN 'cash' ELSE 'transfer' END AS paymentMethod,
              o.payment_status AS paymentStatus, p.proof_key AS paymentProofKey
       FROM orders o LEFT JOIN payments_bank_transfer_proofs p ON p.order_id = o.id
       WHERE o.order_number = ? AND o.user_id = ?`,
    )
    .bind(orderNumber, userId)
    .first<{
      orderNumber: string;
      totalCents: number;
      status: OrderStatus;
      paymentMethod: PaymentMethod;
      paymentStatus: string;
      paymentProofKey: string | null;
    }>();
}

export async function listOrders(
  db: D1Database,
  { status, search, pageSize = 25, after, before }: ListOrdersOptions = {},
): Promise<CursorPage<AdminOrder>> {
  if (after && before) throw new CursorError("after and before cursors are mutually exclusive.");
  const size = normalizePageSize(pageSize);
  const conditions: string[] = [];
  const bindings: unknown[] = [];
  if (status) {
    conditions.push("o.status = ?");
    bindings.push(status);
  }
  if (search) {
    conditions.push(
      "(o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_email LIKE ? OR o.customer_phone LIKE ?)",
    );
    const like = `%${search}%`;
    bindings.push(like, like, like, like);
  }
  const filters = cursorFilterSignature({ status: status ?? null, search: search ?? null });
  let direction: "ASC" | "DESC" = "DESC";
  if (after) {
    const cursor = assertCursor(after, { domain: "orders", filters });
    if (typeof cursor.keys["createdAt"] !== "string" || typeof cursor.keys["id"] !== "number") {
      throw new CursorError("Order cursor sort keys are invalid.");
    }
    conditions.push("(o.created_at < ? OR (o.created_at = ? AND o.id < ?))");
    bindings.push(cursor.keys["createdAt"], cursor.keys["createdAt"], cursor.keys["id"]);
  }
  if (before) {
    const cursor = assertCursor(before, { domain: "orders", filters });
    if (typeof cursor.keys["createdAt"] !== "string" || typeof cursor.keys["id"] !== "number") {
      throw new CursorError("Order cursor sort keys are invalid.");
    }
    conditions.push("(o.created_at > ? OR (o.created_at = ? AND o.id > ?))");
    bindings.push(cursor.keys["createdAt"], cursor.keys["createdAt"], cursor.keys["id"]);
    direction = "ASC";
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { results } = await db
    .prepare(
      `SELECT o.id, o.order_number, o.customer_name, o.customer_email, o.created_at,
              o.customer_phone,
              COALESCE(SUM(oi.quantity), 0) AS item_count, o.total_cents, o.status,
              CASE WHEN p.order_id IS NULL THEN 'cash' ELSE 'transfer' END AS payment_method,
              o.payment_status, p.proof_key AS payment_proof_key
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN payments_bank_transfer_proofs p ON p.order_id = o.id
       ${where}
       GROUP BY o.id ORDER BY o.created_at ${direction}, o.id ${direction}
       LIMIT ?`,
    )
    .bind(...bindings, size + 1)
    .all<{
      id: number;
      order_number: string;
      customer_name: string;
      customer_email: string | null;
      customer_phone: string;
      created_at: string;
      item_count: number;
      total_cents: number | null;
      status: OrderStatus;
      payment_method: PaymentMethod;
      payment_status: "unpaid" | "paid";
      payment_proof_key: string | null;
    }>();
  const hasExtra = results.length > size;
  const rows = results.slice(0, size).map((row) => ({
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    createdAt: row.created_at,
    itemCount: row.item_count,
    totalCents: row.total_cents,
    status: row.status,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    paymentProofKey: row.payment_proof_key,
  }));
  if (before) rows.reverse();
  const first = rows[0];
  const last = rows.at(-1);
  const makeCursor = (order: AdminOrder | undefined): string | null =>
    order
      ? encodeCursor({
          domain: "orders",
          keys: { createdAt: order.createdAt, id: order.id },
          filters,
        })
      : null;
  return {
    items: rows,
    pageInfo: {
      startCursor: makeCursor(first),
      endCursor: makeCursor(last),
      hasNextPage: before ? true : hasExtra,
      hasPreviousPage: Boolean(after) || (Boolean(before) && hasExtra),
    },
  };
}

/**
 * Load the order inspector payload in one joined read. The list page keeps
 * using listOrders (one aggregate query); this helper is only called for the
 * selected order in the progressive-enhancement quick view.
 */
export async function findAdminOrderDetail(
  db: D1Database,
  id: number,
): Promise<AdminOrderDetail | null> {
  const { results } = await db
    .prepare(
      `SELECT o.id, o.order_number, o.customer_name, o.customer_email,
              o.customer_phone, o.shipping_address, o.shipping_city,
              o.shipping_postal_code, o.customer_note, o.source, o.created_at,
              o.total_cents, o.status, o.payment_status,
              CASE WHEN p.order_id IS NULL THEN 'cash' ELSE 'transfer' END AS payment_method,
              p.proof_key AS payment_proof_key,
              oi.item_id, oi.product_name, oi.sku, oi.price_cents,
              oi.quantity, oi.line_total_cents
       FROM orders o
       LEFT JOIN payments_bank_transfer_proofs p ON p.order_id = o.id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = ?
       ORDER BY oi.id ASC`,
    )
    .bind(id)
    .all<{
      id: number;
      order_number: string;
      customer_name: string;
      customer_email: string | null;
      customer_phone: string;
      shipping_address: string;
      shipping_city: string;
      shipping_postal_code: string;
      customer_note: string;
      source: string;
      created_at: string;
      total_cents: number | null;
      status: OrderStatus;
      payment_status: "unpaid" | "paid";
      payment_method: PaymentMethod;
      payment_proof_key: string | null;
      item_id: number | null;
      product_name: string | null;
      sku: string | null;
      price_cents: number | null;
      quantity: number | null;
      line_total_cents: number | null;
    }>();

  const first = results[0];
  if (!first) return null;
  return {
    id: first.id,
    orderNumber: first.order_number,
    customerName: first.customer_name,
    customerEmail: first.customer_email,
    createdAt: first.created_at,
    itemCount: results.reduce((count, row) => count + (row.quantity ?? 0), 0),
    totalCents: first.total_cents,
    status: first.status,
    paymentMethod: first.payment_method,
    paymentStatus: first.payment_status,
    paymentProofKey: first.payment_proof_key,
    customerPhone: first.customer_phone,
    shippingAddress: first.shipping_address,
    shippingCity: first.shipping_city,
    shippingPostalCode: first.shipping_postal_code,
    customerNote: first.customer_note,
    source: first.source,
    items: results.flatMap((row) =>
      row.item_id === null || row.product_name === null || row.sku === null || row.quantity === null
        ? []
        : [
            {
              itemId: row.item_id,
              productName: row.product_name,
              sku: row.sku,
              priceCents: row.price_cents ?? 0,
              quantity: row.quantity,
              lineTotalCents: row.line_total_cents,
            },
          ],
    ),
  };
}

/** Operational dashboard values derived only from orders that actually exist. */
export async function getOrderDashboardSummary(db: D1Database): Promise<OrderDashboardSummary> {
  const [sales, revenue, pending, transferPending, statusRows, recentOrders] = await Promise.all([
    db
      .prepare(
        "SELECT COALESCE(SUM(total_cents), 0) AS value FROM orders WHERE status != 'cancelled' AND date(created_at) = date('now')",
      )
      .first<{ value: number }>(),
    db
      .prepare(
        "SELECT COALESCE(SUM(total_cents), 0) AS value FROM orders WHERE status != 'cancelled' AND created_at >= datetime('now', '-30 day')",
      )
      .first<{ value: number }>(),
    // 'pending' (a placed physical order) and 'inquiry' (a fresh lead) are
    // the two lifecycles' respective "just arrived, admin hasn't acted yet"
    // states. 'quoted' is deliberately excluded — the admin already acted;
    // the ball is in the customer's court.
    db
      .prepare("SELECT COUNT(*) AS value FROM orders WHERE status IN ('pending', 'inquiry')")
      .first<{ value: number }>(),
    db
      .prepare(
        "SELECT COUNT(*) AS value FROM orders o JOIN payments_bank_transfer_proofs p ON p.order_id = o.id WHERE o.payment_status = 'unpaid' AND p.proof_key IS NOT NULL",
      )
      .first<{ value: number }>(),
    db
      .prepare("SELECT status, COUNT(*) AS value FROM orders GROUP BY status")
      .all<{ status: OrderStatus; value: number }>(),
    listOrders(db, { pageSize: 5 }),
  ]);
  const statusCounts = Object.fromEntries(orderStatuses.map((status) => [status, 0])) as Record<
    OrderStatus,
    number
  >;
  for (const row of statusRows.results) statusCounts[row.status] = row.value;
  return {
    todaySalesCents: sales?.value ?? 0,
    thirtyDayRevenueCents: revenue?.value ?? 0,
    pendingCount: pending?.value ?? 0,
    transferPendingCount: transferPending?.value ?? 0,
    statusCounts,
    recentOrders: recentOrders.items,
  };
}

export async function updateOrderStatus(db: D1Database, id: number, status: OrderStatus) {
  const current = await db
    .prepare("SELECT status FROM orders WHERE id = ?")
    .bind(id)
    .first<{ status: OrderStatus }>();
  if (!current) throw new Error("Order tidak ditemukan.");
  if (status !== current.status && !orderTransitions[current.status].includes(status)) {
    throw new Error(`Order berstatus "${current.status}" tidak dapat dipindahkan ke "${status}".`);
  }
  const { results: items } = await db
    .prepare("SELECT item_id AS itemId, quantity FROM order_items WHERE order_id = ?")
    .bind(id)
    .all<{ itemId: number; quantity: number }>();

  const hookStatements = collectOrderStatusChangeStatements({
    db,
    orderId: id,
    previousStatus: current.status,
    nextStatus: status,
    items,
  });

  // 'delivered' (physical) and 'completed' (service) are the two lifecycles'
  // respective "fulfilled" terminal states — both imply payment is settled,
  // same as the pre-existing 'delivered' rule.
  const statusUpdate = db
    .prepare(
      `UPDATE orders
       SET status = ?, payment_status = CASE WHEN ? IN ('delivered', 'completed') THEN 'paid' ELSE payment_status END,
           updated_at = datetime('now')
       WHERE id = ?`,
    )
    .bind(status, status, id);

  try {
    await db.batch([statusUpdate, ...hookStatements]);
  } catch (error) {
    throw mapD1Error(error);
  }
}

export async function attachPaymentProof(
  db: D1Database,
  orderNumber: string,
  userId: string,
  proofKey: string,
) {
  const result = await db
    .prepare(
      `UPDATE payments_bank_transfer_proofs
       SET proof_key = ?
       WHERE proof_key IS NULL
         AND order_id = (
           SELECT id FROM orders WHERE order_number = ? AND user_id = ? AND payment_status = 'unpaid'
         )`,
    )
    .bind(proofKey, orderNumber, userId)
    .run();
  if (result.meta.changes === 0)
    throw new Error("Order tidak ditemukan atau pembayaran sudah diverifikasi.");
}

export async function approvePayment(db: D1Database, id: number) {
  const result = await db
    .prepare(
      `UPDATE orders SET payment_status = 'paid', updated_at = datetime('now')
       WHERE id = ? AND payment_status = 'unpaid'
         AND EXISTS (SELECT 1 FROM payments_bank_transfer_proofs WHERE order_id = orders.id)`,
    )
    .bind(id)
    .run();
  if (result.meta.changes === 0)
    throw new Error("Order tidak ditemukan atau pembayaran sudah diverifikasi.");
}
