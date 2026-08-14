/** Builds the URL for an R2 object key served through the generic media route. */
export function mediaUrl(key: string): string {
  return `/api/images/${key}`;
}
