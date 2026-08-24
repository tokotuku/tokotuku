/** Builds the URL for an R2 object key served through the generic media route. */
export function mediaUrl(key: string): string {
  return `/api/images/${key}`;
}

/** MIME types that are safe to expose through the public image proxy. */
export const SAFE_RASTER_IMAGE_TYPES = [
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type SafeRasterImageType = (typeof SAFE_RASTER_IMAGE_TYPES)[number];

export const PAYMENT_PROOF_TYPES = [...SAFE_RASTER_IMAGE_TYPES, "application/pdf"] as const;

export type PaymentProofType = (typeof PAYMENT_PROOF_TYPES)[number];

export function isSafeRasterImageType(value: string): value is SafeRasterImageType {
  return (SAFE_RASTER_IMAGE_TYPES as readonly string[]).includes(value);
}

export function isPaymentProofType(value: string): value is PaymentProofType {
  return (PAYMENT_PROOF_TYPES as readonly string[]).includes(value);
}

export function extensionForMediaType(type: string): string {
  const extensions: Record<string, string> = {
    "application/pdf": "pdf",
    "image/avif": "avif",
    "image/gif": "gif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return extensions[type] ?? "bin";
}
