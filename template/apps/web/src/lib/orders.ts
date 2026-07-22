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

  const placeholders = cart.map(() => "?").join(", ");
  const { results } = await db
    .prepare(
      `SELECT id, name, description, price_cents, image_key, sku, category, stock, is_active, custom_fields_json
       FROM products WHERE id IN (${placeholders}) AND is_active = 1`,
    )
    .bind(...cart.map((item) => item.id))
    .all<{
      id: number;
      name: string;
      description: string;
      price_cents: number;
      image_key: string;
      sku: string;
      category: string;
      stock: number;
      is_active: number;
      custom_fields_json: string;
    }>();

  if (results.length !== cart.length) throw new Error("Ada produk yang sudah tidak tersedia.");
  const products = new Map(results.map((product) => [product.id, product]));
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
    subtotalCents += product.price_cents * item.quantity;
  }
  const orderNumber = `TK-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

  const statements = [
    db
      .prepare(
        `INSERT INTO orders
          (order_number, user_id, customer_name, customer_email, customer_phone, shipping_address,
           shipping_city, shipping_postal_code, customer_note, subtotal_cents, total_cents, payment_method)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        paymentMethod,
      ),
    ...cart.map((item) => {
      const product = products.get(item.id);
      if (!product) throw new Error("Ada produk yang sudah tidak tersedia.");
      return db
        .prepare(
          `INSERT INTO order_items
            (order_id, product_id, product_name, sku, price_cents, quantity, line_total_cents)
           VALUES ((SELECT id FROM orders WHERE order_number = ?), ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          orderNumber,
          product.id,
          product.name,
          product.sku,
          product.price_cents,
          item.quantity,
          product.price_cents * item.quantity,
        );
    }),
  ];

  try {
    await db.batch(statements);
  } catch (error) {
    if (error instanceof Error && error.message.includes("insufficient_stock")) {
      throw new Error("Stok berubah saat checkout. Periksa keranjang lalu coba lagi.");
    }
    throw error;
  }

  return { orderNumber, totalCents: subtotalCents };
}

export async function findCustomerOrder(db: D1Database, orderNumber: string, userId: string) {
  return db
    .prepare(
      `SELECT order_number AS orderNumber, total_cents AS totalCents, status,
              payment_method AS paymentMethod, payment_status AS paymentStatus,
              payment_proof_key AS paymentProofKey
       FROM orders WHERE order_number = ? AND user_id = ?`,
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
              o.payment_method, o.payment_status, o.payment_proof_key
       FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
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
  await db
    .prepare(
      `UPDATE orders
       SET status = ?, payment_status = CASE WHEN ? = 'delivered' THEN 'paid' ELSE payment_status END,
           updated_at = datetime('now')
       WHERE id = ?`,
    )
    .bind(status, status, id)
    .run();
}

export async function attachPaymentProof(
  db: D1Database,
  orderNumber: string,
  userId: string,
  proofKey: string,
) {
  const result = await db
    .prepare(
      `UPDATE orders SET payment_proof_key = ?, updated_at = datetime('now')
       WHERE order_number = ? AND user_id = ? AND payment_method = 'transfer' AND payment_status = 'unpaid'`,
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
       WHERE id = ? AND payment_method = 'transfer' AND payment_status = 'unpaid'`,
    )
    .bind(id)
    .run();
  if (result.meta.changes === 0)
    throw new Error("Order tidak ditemukan atau pembayaran sudah diverifikasi.");
}
