interface ProductRow {
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
}

export interface Product {
  id: number;
  name: string;
  description: string;
  priceCents: number;
  imageKey: string;
  sku: string;
  category: string;
  stock: number;
  isActive: boolean;
  customFields: Record<string, string>;
}

export interface ProductInput {
  name: string;
  description: string;
  priceCents: number;
  imageKey: string;
  sku: string;
  category: string;
  stock: number;
  isActive: boolean;
  customFields: Record<string, string>;
}

export interface InventoryMovement {
  id: number;
  quantityChange: number;
  reason: "sale" | "cancelled_order" | "manual_adjustment";
  note: string;
  createdAt: string;
}

export interface ListProductsOptions {
  limit?: number;
  offset?: number;
  activeOnly?: boolean;
  category?: string;
  search?: string;
}

const productColumns =
  "id, name, description, price_cents, image_key, sku, category, stock, is_active, custom_fields_json";

function parseCustomFields(value: string): Record<string, string> {
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([key, fieldValue]) => key.trim() && typeof fieldValue === "string")
        .map(([key, fieldValue]) => [key.trim(), fieldValue as string]),
    );
  } catch {
    return {};
  }
}

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    imageKey: row.image_key,
    sku: row.sku,
    category: row.category,
    stock: row.stock,
    isActive: row.is_active === 1,
    customFields: parseCustomFields(row.custom_fields_json),
  };
}

function buildProductFilter({
  activeOnly = true,
  category,
  search,
}: Pick<ListProductsOptions, "activeOnly" | "category" | "search">) {
  const conditions: string[] = [];
  const bindings: unknown[] = [];
  if (activeOnly) conditions.push("is_active = 1");
  if (category) {
    conditions.push("category = ?");
    bindings.push(category);
  }
  if (search) {
    conditions.push("(name LIKE ? OR description LIKE ?)");
    const like = `%${search}%`;
    bindings.push(like, like);
  }
  const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
  return { where, bindings };
}

export async function listProducts(
  db: D1Database,
  { limit, offset, activeOnly = true, category, search }: ListProductsOptions = {},
): Promise<Product[]> {
  const { where, bindings } = buildProductFilter({ activeOnly, category, search });
  let query = `SELECT ${productColumns} FROM products${where} ORDER BY id DESC`;
  if (limit !== undefined) {
    query += " LIMIT ?";
    bindings.push(Math.max(0, Math.trunc(limit)));
  }
  if (offset !== undefined) {
    query += " OFFSET ?";
    bindings.push(Math.max(0, Math.trunc(offset)));
  }
  const { results } = await db
    .prepare(query)
    .bind(...bindings)
    .all<ProductRow>();
  return results.map(toProduct);
}

export async function countProducts(
  db: D1Database,
  {
    activeOnly = true,
    category,
    search,
  }: Pick<ListProductsOptions, "activeOnly" | "category" | "search"> = {},
): Promise<number> {
  const { where, bindings } = buildProductFilter({ activeOnly, category, search });
  const row = await db
    .prepare(`SELECT COUNT(*) AS count FROM products${where}`)
    .bind(...bindings)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export async function listCategories(db: D1Database): Promise<string[]> {
  const { results } = await db
    .prepare("SELECT DISTINCT category FROM products WHERE is_active = 1 ORDER BY category ASC")
    .all<{ category: string }>();
  return results.map((row) => row.category);
}

export async function findProductById(
  db: D1Database,
  id: number,
  { includeInactive = false }: { includeInactive?: boolean } = {},
): Promise<Product | null> {
  const row = await db
    .prepare(
      `SELECT ${productColumns} FROM products WHERE id = ?${includeInactive ? "" : " AND is_active = 1"}`,
    )
    .bind(id)
    .first<ProductRow>();
  return row ? toProduct(row) : null;
}

export async function createProduct(db: D1Database, input: ProductInput): Promise<number> {
  const row = await db
    .prepare(
      `INSERT INTO products
        (name, description, price_cents, image_key, sku, category, stock, is_active, custom_fields_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       RETURNING id`,
    )
    .bind(
      input.name,
      input.description,
      input.priceCents,
      input.imageKey,
      input.sku,
      input.category,
      input.stock,
      input.isActive ? 1 : 0,
      JSON.stringify(input.customFields),
    )
    .first<{ id: number }>();
  if (!row) throw new Error("Product could not be created");
  if (input.stock > 0) {
    await db
      .prepare(
        "INSERT INTO inventory_movements (product_id, quantity_change, reason, note) VALUES (?, ?, 'manual_adjustment', 'Initial stock')",
      )
      .bind(row.id, input.stock)
      .run();
  }
  return row.id;
}

export async function updateProduct(db: D1Database, id: number, input: ProductInput) {
  const current = await db
    .prepare("SELECT stock FROM products WHERE id = ?")
    .bind(id)
    .first<{ stock: number }>();
  if (!current) throw new Error("Product not found");
  const stockChange = input.stock - current.stock;
  const statements = [
    db
      .prepare(
        `UPDATE products SET
        name = ?, description = ?, price_cents = ?, image_key = ?, sku = ?, category = ?,
        stock = ?, is_active = ?, custom_fields_json = ?, updated_at = datetime('now')
       WHERE id = ?`,
      )
      .bind(
        input.name,
        input.description,
        input.priceCents,
        input.imageKey,
        input.sku,
        input.category,
        input.stock,
        input.isActive ? 1 : 0,
        JSON.stringify(input.customFields),
        id,
      ),
  ];
  if (stockChange !== 0) {
    statements.push(
      db
        .prepare(
          "INSERT INTO inventory_movements (product_id, quantity_change, reason, note) VALUES (?, ?, 'manual_adjustment', 'Stock changed in product editor')",
        )
        .bind(id, stockChange),
    );
  }
  await db.batch(statements);
}

export async function archiveProduct(db: D1Database, id: number) {
  await db
    .prepare("UPDATE products SET is_active = 0, updated_at = datetime('now') WHERE id = ?")
    .bind(id)
    .run();
}

export async function listInventoryMovements(
  db: D1Database,
  productId: number,
): Promise<InventoryMovement[]> {
  const { results } = await db
    .prepare(
      `SELECT id, quantity_change, reason, note, created_at
       FROM inventory_movements WHERE product_id = ? ORDER BY id DESC LIMIT 30`,
    )
    .bind(productId)
    .all<{
      id: number;
      quantity_change: number;
      reason: InventoryMovement["reason"];
      note: string;
      created_at: string;
    }>();
  return results.map((row) => ({
    id: row.id,
    quantityChange: row.quantity_change,
    reason: row.reason,
    note: row.note,
    createdAt: row.created_at,
  }));
}
