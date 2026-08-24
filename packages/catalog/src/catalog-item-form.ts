import type { R2Bucket } from "@cloudflare/workers-types";
import type { CatalogItemInput } from "./catalog-items";

/** Kept in sync with the <select> in ProductForm.astro. */
export const fulfillmentTypes = ["physical", "scheduled"] as const;

function requiredText(form: FormData, name: string, label: string) {
  const value = String(form.get(name) ?? "").trim();
  if (!value) throw new Error(`${label} wajib diisi.`);
  return value;
}

export async function catalogItemInputFromForm(
  form: FormData,
  images: R2Bucket,
  existingImageKey = "",
  presentation: "products" | "services" = "products",
): Promise<CatalogItemInput> {
  const services = presentation === "services";
  const name = requiredText(form, "name", services ? "Nama layanan" : "Nama produk");
  const description = requiredText(form, "description", "Deskripsi");
  const sku = requiredText(form, "sku", "SKU").toUpperCase();
  const category = requiredText(form, "category", "Kategori");
  const rawPrice = String(form.get("price") ?? "").trim();
  const price = rawPrice ? Number(rawPrice) : null;
  const fulfillmentType = String(
    form.get("fulfillmentType") ?? (services ? "scheduled" : "physical"),
  );
  if (!fulfillmentTypes.includes(fulfillmentType as (typeof fulfillmentTypes)[number]))
    throw new Error("Tipe pemenuhan tidak valid.");
  if (services && fulfillmentType !== "scheduled") throw new Error("Layanan harus terjadwal.");
  // A 'scheduled' item's stock input is disabled in the form, so it is
  // absent from the submission entirely — 0 is the correct read, not a
  // validation failure.
  const stock = fulfillmentType === "physical" ? Number(form.get("stock")) : 0;
  if (price !== null && (!Number.isFinite(price) || price < 0))
    throw new Error("Harga tidak valid.");
  if (!services && price === null) throw new Error("Harga produk wajib diisi.");
  if (!Number.isInteger(stock) || stock < 0)
    throw new Error("Stok harus berupa bilangan bulat positif.");

  let imageKey = existingImageKey;
  const image = form.get("image");
  if (image instanceof File && image.size > 0) {
    if (!image.type.startsWith("image/"))
      throw new Error(
        services ? "File layanan harus berupa gambar." : "File produk harus berupa gambar.",
      );
    if (image.size > 5 * 1024 * 1024)
      throw new Error(services ? "Ukuran gambar maksimal 5 MB." : "Ukuran gambar maksimal 5 MB.");
    const extension =
      image.name
        .split(".")
        .pop()
        ?.replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase() || "bin";
    imageKey = `${presentation}/${crypto.randomUUID()}.${extension}`;
    await images.put(imageKey, await image.arrayBuffer(), {
      httpMetadata: { contentType: image.type },
    });
  }
  if (!imageKey)
    throw new Error(services ? "Gambar layanan wajib diunggah." : "Gambar produk wajib diunggah.");

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
    priceCents: price === null ? null : Math.round(price * 100),
    imageKey,
    sku,
    category,
    stock,
    isActive: form.get("isActive") === "on",
    customFields,
    fulfillmentType,
  };
}
