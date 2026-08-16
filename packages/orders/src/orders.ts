import type { D1Database } from "@cloudflare/workers-types";
import { findProductsByIds } from "@takontuku/catalog";
import {
  ConstraintViolationError,
  collectOrderCreateStatements,
  collectOrderStatusChangeStatements,
  mapD1Error,
} from "@takontuku/core";

export const orderStatuses = ["pending", "confirmed", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof orderStatuses)[number];

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
  customerEmail: string;
  createdAt: string;
  itemCount: number;
  totalCents: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: "unpaid" | "paid";
  paymentProofKey: string | null;
}

export interface OrderDashboardSummary {
  todaySalesCents: number;
  thirtyDayRevenueCents: number;
  pendingCount: number;
  recentOrders: AdminOrder[];
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

  const foundProducts = await findProductsByIds(
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
    subtotalCents += product.priceCents * item.quantity;
  }
  const orderNumber = `TK-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

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

export async function listOrders(db: D1Database): Promise<AdminOrder[]> {
  const { results } = await db
    .prepare(
      `SELECT o.id, o.order_number, o.customer_name, o.customer_email, o.created_at,
              COALESCE(SUM(oi.quantity), 0) AS item_count, o.total_cents, o.status,
              CASE WHEN p.order_id IS NULL THEN 'cash' ELSE 'transfer' END AS payment_method,
              o.payment_status, p.proof_key AS payment_proof_key
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN payments_bank_transfer_proofs p ON p.order_id = o.id
       GROUP BY o.id ORDER BY o.created_at DESC, o.id DESC`,
    )
    .all<{
      id: number;
      order_number: string;
      customer_name: string;
      customer_email: string;
      created_at: string;
      item_count: number;
      total_cents: number;
      status: OrderStatus;
      payment_method: PaymentMethod;
      payment_status: "unpaid" | "paid";
      payment_proof_key: string | null;
    }>();
  return results.map((row) => ({
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    createdAt: row.created_at,
    itemCount: row.item_count,
    totalCents: row.total_cents,
    status: row.status,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    paymentProofKey: row.payment_proof_key,
  }));
}

/** Operational dashboard values derived only from orders that actually exist. */
export async function getOrderDashboardSummary(db: D1Database): Promise<OrderDashboardSummary> {
  const [sales, revenue, pending, recentOrders] = await Promise.all([
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
    db
      .prepare("SELECT COUNT(*) AS value FROM orders WHERE status = 'pending'")
      .first<{ value: number }>(),
    listOrders(db),
  ]);
  return {
    todaySalesCents: sales?.value ?? 0,
    thirtyDayRevenueCents: revenue?.value ?? 0,
    pendingCount: pending?.value ?? 0,
    recentOrders: recentOrders.slice(0, 5),
  };
}

export async function updateOrderStatus(db: D1Database, id: number, status: OrderStatus) {
  const current = await db
    .prepare("SELECT status FROM orders WHERE id = ?")
    .bind(id)
    .first<{ status: OrderStatus }>();
  if (!current) throw new Error("Order tidak ditemukan.");
  if (current.status === "cancelled")
    throw new Error("Order yang dibatalkan tidak dapat diaktifkan kembali.");
  if (current.status === "delivered")
    throw new Error("Order yang sudah diterima dan dibayar tidak dapat diubah lagi.");
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

  const statusUpdate = db
    .prepare(
      `UPDATE orders
       SET status = ?, payment_status = CASE WHEN ? = 'delivered' THEN 'paid' ELSE payment_status END,
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
