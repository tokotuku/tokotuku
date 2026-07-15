interface ProductRow {
  id: number;
  name: string;
  description: string;
  price_cents: number;
  image_key: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  priceCents: number;
  imageKey: string;
}

export interface ListProductsOptions {
  limit?: number;
}

const productColumns = "id, name, description, price_cents, image_key";

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    imageKey: row.image_key,
  };
}

export async function listProducts(
  db: D1Database,
  { limit }: ListProductsOptions = {},
): Promise<Product[]> {
  const query = `SELECT ${productColumns} FROM products ORDER BY id${limit === undefined ? "" : " LIMIT ?"}`;
  const statement = db.prepare(query);
  const prepared = limit === undefined ? statement : statement.bind(Math.max(0, Math.trunc(limit)));
  const { results } = await prepared.all<ProductRow>();

  return results.map(toProduct);
}

export async function findProductById(db: D1Database, id: number): Promise<Product | null> {
  const row = await db
    .prepare(`SELECT ${productColumns} FROM products WHERE id = ?`)
    .bind(id)
    .first<ProductRow>();

  return row ? toProduct(row) : null;
}
