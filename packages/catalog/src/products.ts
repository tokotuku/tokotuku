import type { D1Database } from "@cloudflare/workers-types";
import {
  assertCursor,
  CursorError,
  type CursorPage,
  cursorFilterSignature,
  encodeCursor,
  normalizePageSize,
} from "@takontuku/core";

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
  fulfillment_type: string;
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
  fulfillmentType: string;
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
  /**
   * 'physical' (default) or 'scheduled' — see the note on catalog_items in
   * migrations/0001_init.sql. Only 'physical' items get an
   * inventory_item_stock row; 'scheduled' items are booked, not stocked.
   */
  fulfillmentType: string;
}

export interface InventoryMovement {
  id: number;
  quantityChange: number;
  reason: "sale" | "cancelled_order" | "manual_adjustment";
  note: string;
  createdAt: string;
}

export interface CatalogDashboardSummary {
  total: number;
  active: number;
  lowStock: number;
  outOfStock: number;
}

export interface ListProductsOptions {
  pageSize?: number;
  /** Numbered storefront pagination remains supported; admin routes use cursors. */
  offset?: number;
  after?: string;
  before?: string;
  activeOnly?: boolean;
  category?: string | undefined;
  search?: string | undefined;
}

const productColumns =
  "ci.id, ci.name, ci.description, ci.price_cents, ci.image_key, ci.sku, ci.category, " +
  "COALESCE(s.on_hand, 0) AS stock, ci.is_active, ci.custom_fields_json, ci.fulfillment_type";

const productFrom = "FROM catalog_items ci LEFT JOIN inventory_item_stock s ON s.item_id = ci.id";

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
    fulfillmentType: row.fulfillment_type,
  };
}

function buildProductFilter({
  activeOnly = true,
  category,
  search,
}: Pick<ListProductsOptions, "activeOnly" | "category" | "search">) {
  // price_cents IS NOT NULL is the line between "storefront product" and a
  // quote-only catalog item (fulfillment_type = 'project' etc.) — those are
  // read through a different module, never through this list.
  const conditions: string[] = ["ci.price_cents IS NOT NULL"];
  const bindings: unknown[] = [];
  if (activeOnly) conditions.push("ci.is_active = 1");
  if (category) {
    conditions.push("ci.category = ?");
    bindings.push(category);
  }
  if (search) {
    conditions.push("(ci.name LIKE ? OR ci.sku LIKE ?)");
    const like = `%${search}%`;
    bindings.push(like, like);
  }
  return { where: ` WHERE ${conditions.join(" AND ")}`, bindings };
}

export async function listProducts(
  db: D1Database,
  {
    pageSize = 25,
    offset,
    after,
    before,
    activeOnly = true,
    category,
    search,
  }: ListProductsOptions = {},
): Promise<CursorPage<Product>> {
  if (after && before) throw new CursorError("after and before cursors are mutually exclusive.");
  const size = normalizePageSize(pageSize);
  const { where, bindings } = buildProductFilter({ activeOnly, category, search });
  const filters = cursorFilterSignature({
    activeOnly,
    category: category ?? null,
    search: search ?? null,
  });
  let direction: "ASC" | "DESC" = "DESC";
  if (after) {
    const cursor = assertCursor(after, { domain: "catalog", filters });
    const id = cursor.keys["id"];
    if (typeof id !== "number") throw new CursorError("Catalog cursor sort key is invalid.");
    bindings.push(id);
  }
  if (before) {
    const cursor = assertCursor(before, { domain: "catalog", filters });
    const id = cursor.keys["id"];
    if (typeof id !== "number") throw new CursorError("Catalog cursor sort key is invalid.");
    bindings.push(id);
    direction = "ASC";
  }
  let cursorWhere = "";
  if (after) cursorWhere = " AND ci.id < ?";
  else if (before) cursorWhere = " AND ci.id > ?";
  const numbered = offset !== undefined && !after && !before;
  const pagination = numbered ? "LIMIT ? OFFSET ?" : "LIMIT ?";
  const query = `SELECT ${productColumns} ${productFrom}${where}${cursorWhere} ORDER BY ci.id ${direction} ${pagination}`;
  bindings.push(numbered ? size : size + 1);
  if (numbered) bindings.push(Math.max(0, Math.trunc(offset)));
  const { results } = await db
    .prepare(query)
    .bind(...bindings)
    .all<ProductRow>();
  const hasExtra = results.length > size;
  const pageRows = results.slice(0, size).map(toProduct);
  if (before) pageRows.reverse();
  const first = pageRows[0];
  const last = pageRows.at(-1);
  const makeCursor = (product: Product | undefined): string | null =>
    product ? encodeCursor({ domain: "catalog", keys: { id: product.id }, filters }) : null;

  let hasNextPage = hasExtra;
  let hasPreviousPage = Boolean(after);
  if (numbered) {
    hasNextPage = false;
    hasPreviousPage = Boolean(offset);
  } else if (before) {
    hasNextPage = true;
    hasPreviousPage = hasExtra;
  }

  return {
    items: pageRows,
    pageInfo: {
      startCursor: makeCursor(first),
      endCursor: makeCursor(last),
      hasNextPage,
      hasPreviousPage,
    },
  };
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
    .prepare(`SELECT COUNT(*) AS count ${productFrom}${where}`)
    .bind(...bindings)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

/** Aggregate inspector values independently of the current 25-row admin page. */
export async function getCatalogDashboardSummary(db: D1Database): Promise<CatalogDashboardSummary> {
  const row = await db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN ci.is_active = 1 THEN 1 ELSE 0 END) AS active,
         SUM(CASE WHEN ci.is_active = 1 AND ci.fulfillment_type = 'physical' AND COALESCE(s.on_hand, 0) BETWEEN 1 AND 5 THEN 1 ELSE 0 END) AS low_stock,
         SUM(CASE WHEN ci.is_active = 1 AND ci.fulfillment_type = 'physical' AND COALESCE(s.on_hand, 0) = 0 THEN 1 ELSE 0 END) AS out_of_stock
       ${productFrom}
       WHERE ci.price_cents IS NOT NULL`,
    )
    .first<{ total: number; active: number; low_stock: number; out_of_stock: number }>();
  return {
    total: row?.total ?? 0,
    active: row?.active ?? 0,
    lowStock: row?.low_stock ?? 0,
    outOfStock: row?.out_of_stock ?? 0,
  };
}

export async function listCategories(db: D1Database): Promise<string[]> {
  const { results } = await db
    .prepare(
      "SELECT DISTINCT category FROM catalog_items WHERE is_active = 1 AND price_cents IS NOT NULL ORDER BY category ASC",
    )
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
      `SELECT ${productColumns} ${productFrom} WHERE ci.id = ? AND ci.price_cents IS NOT NULL${includeInactive ? "" : " AND ci.is_active = 1"}`,
    )
    .bind(id)
    .first<ProductRow>();
  return row ? toProduct(row) : null;
}

export async function findProductsByIds(db: D1Database, ids: number[]): Promise<Product[]> {
  if (!ids.length) return [];
  const placeholders = ids.map(() => "?").join(", ");
  const { results } = await db
    .prepare(
      `SELECT ${productColumns} ${productFrom} WHERE ci.id IN (${placeholders}) AND ci.is_active = 1 AND ci.price_cents IS NOT NULL`,
    )
    .bind(...ids)
    .all<ProductRow>();
  return results.map(toProduct);
}

export async function createProduct(db: D1Database, input: ProductInput): Promise<number> {
  const row = await db
    .prepare(
      `INSERT INTO catalog_items
        (name, description, price_cents, image_key, sku, category, is_active, custom_fields_json, fulfillment_type, updated_at)
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
      input.isActive ? 1 : 0,
      JSON.stringify(input.customFields),
      input.fulfillmentType,
    )
    .first<{ id: number }>();
  if (!row) throw new Error("Product could not be created");

  // Stock is a physical-goods concept. A scheduled (booking) item has
  // nothing to count, so it never gets an inventory_item_stock row at all —
  // not a row with on_hand = 0, which would render as "sold out".
  if (input.fulfillmentType === "physical") {
    const statements = [
      db
        .prepare("INSERT INTO inventory_item_stock (item_id, on_hand) VALUES (?, ?)")
        .bind(row.id, input.stock),
    ];
    if (input.stock > 0) {
      statements.push(
        db
          .prepare(
            "INSERT INTO inventory_movements (item_id, quantity_change, reason, note) VALUES (?, ?, 'manual_adjustment', 'Initial stock')",
          )
          .bind(row.id, input.stock),
      );
    }
    await db.batch(statements);
  }
  return row.id;
}

export async function updateProduct(db: D1Database, id: number, input: ProductInput) {
  const exists = await db.prepare("SELECT 1 FROM catalog_items WHERE id = ?").bind(id).first();
  if (!exists) throw new Error("Product not found");

  const statements = [
    db
      .prepare(
        `UPDATE catalog_items SET
        name = ?, description = ?, price_cents = ?, image_key = ?, sku = ?, category = ?,
        is_active = ?, custom_fields_json = ?, fulfillment_type = ?, updated_at = datetime('now')
       WHERE id = ?`,
      )
      .bind(
        input.name,
        input.description,
        input.priceCents,
        input.imageKey,
        input.sku,
        input.category,
        input.isActive ? 1 : 0,
        JSON.stringify(input.customFields),
        input.fulfillmentType,
        id,
      ),
  ];

  // Scheduled (booking) items carry no stock, so there is no diff to write —
  // see the matching branch in createProduct.
  if (input.fulfillmentType === "physical") {
    const current = await db
      .prepare("SELECT COALESCE(on_hand, 0) AS on_hand FROM inventory_item_stock WHERE item_id = ?")
      .bind(id)
      .first<{ on_hand: number }>();
    const stockChange = input.stock - (current?.on_hand ?? 0);
    if (stockChange !== 0) {
      statements.push(
        // Upsert, not a plain UPDATE: an item switched from 'scheduled' to
        // 'physical' just now has no inventory_item_stock row yet, and a
        // plain UPDATE would silently match zero rows.
        db
          .prepare(
            `INSERT INTO inventory_item_stock (item_id, on_hand, updated_at)
             VALUES (?, ?, datetime('now'))
             ON CONFLICT(item_id) DO UPDATE SET on_hand = excluded.on_hand, updated_at = excluded.updated_at`,
          )
          .bind(id, input.stock),
        db
          .prepare(
            "INSERT INTO inventory_movements (item_id, quantity_change, reason, note) VALUES (?, ?, 'manual_adjustment', 'Stock changed in product editor')",
          )
          .bind(id, stockChange),
      );
    }
  }
  await db.batch(statements);
}

export async function archiveProduct(db: D1Database, id: number) {
  await db
    .prepare("UPDATE catalog_items SET is_active = 0, updated_at = datetime('now') WHERE id = ?")
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
       FROM inventory_movements WHERE item_id = ? ORDER BY id DESC LIMIT 30`,
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
