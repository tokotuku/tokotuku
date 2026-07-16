import type { ProductInput } from "./products";

function requiredText(form: FormData, name: string, label: string) {
  const value = String(form.get(name) ?? "").trim();
  if (!value) throw new Error(`${label} wajib diisi.`);
  return value;
}

export async function productInputFromForm(
  form: FormData,
  images: R2Bucket,
  existingImageKey = "",
): Promise<ProductInput> {
  const name = requiredText(form, "name", "Nama produk");
  const description = requiredText(form, "description", "Deskripsi");
  const sku = requiredText(form, "sku", "SKU").toUpperCase();
  const category = requiredText(form, "category", "Kategori");
  const price = Number(form.get("price"));
  const stock = Number(form.get("stock"));
  if (!Number.isFinite(price) || price < 0) throw new Error("Harga tidak valid.");
  if (!Number.isInteger(stock) || stock < 0)
    throw new Error("Stok harus berupa bilangan bulat positif.");

  let imageKey = existingImageKey;
  const image = form.get("image");
  if (image instanceof File && image.size > 0) {
    if (!image.type.startsWith("image/")) throw new Error("File produk harus berupa gambar.");
    if (image.size > 5 * 1024 * 1024) throw new Error("Ukuran gambar maksimal 5 MB.");
    const extension =
      image.name
        .split(".")
        .pop()
        ?.replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase() || "bin";
    imageKey = `products/${crypto.randomUUID()}.${extension}`;
    await images.put(imageKey, image.stream(), { httpMetadata: { contentType: image.type } });
  }
  if (!imageKey) throw new Error("Gambar produk wajib diunggah.");

  const keys = form.getAll("customKey").map(String);
  const values = form.getAll("customValue").map(String);
  const customFields: Record<string, string> = {};
  keys.forEach((key, index) => {
    const normalizedKey = key.trim();
    const value = values[index]?.trim() ?? "";
    if (normalizedKey && value) customFields[normalizedKey] = value;
  });

  return {
    name,
    description,
    priceCents: Math.round(price * 100),
    imageKey,
    sku,
    category,
    stock,
    isActive: form.get("isActive") === "on",
    customFields,
  };
}
