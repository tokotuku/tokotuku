import type { D1Database } from "@cloudflare/workers-types";
import type { KarsaEnv } from "@karsa/core";

const SHORT_WINDOW_SECONDS = 15 * 60;
const MAX_SHORT_WINDOW_SUBMISSIONS = 5;
const MAX_DAILY_SUBMISSIONS = 20;

export function isCanonicalIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function daysBetweenIso(fromIso: string, toIso: string): number {
  if (!isCanonicalIsoDate(fromIso) || !isCanonicalIsoDate(toIso)) return Number.NaN;
  return Math.round(
    (Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000,
  );
}

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmac(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

function normalizeText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizePhone(value: string): string {
  return value.normalize("NFKC").replace(/\D/g, "");
}

export function clientAddress(request: Request, astroClientAddress?: string): string | null {
  const cloudflareAddress = request.headers.get("CF-Connecting-IP")?.trim();
  if (cloudflareAddress) return cloudflareAddress;
  const fallback = astroClientAddress?.trim();
  return fallback || null;
}

export async function clientKey(secret: string, address: string): Promise<string> {
  return hmac(secret, `booking-client:${address}`);
}

export async function submissionFingerprint(
  secret: string,
  clientKeyValue: string,
  bucket: number,
  input: {
    itemId: number;
    mode: string;
    startDate: string;
    endDate: string | null;
    slotId: number | null;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    serviceAddress: string;
    note: string;
  },
): Promise<string> {
  return hmac(
    secret,
    [
      "booking-fingerprint",
      clientKeyValue,
      bucket,
      input.itemId,
      input.mode,
      input.startDate,
      input.endDate ?? "",
      input.slotId ?? "",
      normalizeText(input.customerName),
      normalizePhone(input.customerPhone),
      normalizeText(input.customerEmail),
      normalizeText(input.serviceAddress),
      normalizeText(input.note),
    ].join("\u001f"),
  );
}

export async function verifyTurnstile(
  env: KarsaEnv,
  token: string,
  address: string,
  expectedAction = "booking",
): Promise<boolean> {
  const secret = env.TURNSTILE_SECRET?.trim();
  const hostnames = new Set(
    (env.TURNSTILE_HOSTNAMES ?? "")
      .split(",")
      .map((hostname) => hostname.trim())
      .filter(Boolean),
  );
  if (!secret || !env.TURNSTILE_SITE_KEY?.trim() || hostnames.size === 0) return false;
  if (!token || token.length > 2048) return false;

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: address }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return false;
    const result = (await response.json()) as {
      success?: boolean;
      action?: string;
      hostname?: string;
    };
    return (
      result.success === true &&
      result.action === expectedAction &&
      typeof result.hostname === "string" &&
      hostnames.has(result.hostname)
    );
  } catch {
    return false;
  }
}

export async function findBookingByFingerprint(
  db: D1Database,
  fingerprint: string,
): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT o.order_number AS orderNumber
       FROM booking_order_bookings b
       JOIN orders o ON o.id = b.order_id
       WHERE b.submission_fingerprint = ?`,
    )
    .bind(fingerprint)
    .first<{ orderNumber: string }>();
  return row?.orderNumber ?? null;
}

export async function consumeBookingQuota(
  db: D1Database,
  key: string,
  now = new Date(),
): Promise<void> {
  const shortWindow =
    Math.floor(now.getTime() / 1000 / SHORT_WINDOW_SECONDS) * SHORT_WINDOW_SECONDS;
  const dayWindow = now.toISOString().slice(0, 10);
  await db
    .prepare(
      "DELETE FROM booking_submission_limits WHERE last_seen_at < datetime('now', '-30 days')",
    )
    .run();
  const result = await db
    .prepare(
      `INSERT INTO booking_submission_limits
        (client_key, short_window, short_count, day_window, day_count, last_seen_at)
       VALUES (?, ?, 1, ?, 1, datetime('now'))
       ON CONFLICT(client_key) DO UPDATE SET
         short_window = CASE WHEN excluded.short_window > short_window THEN excluded.short_window ELSE short_window END,
         short_count = CASE WHEN excluded.short_window > short_window THEN 1 ELSE short_count + 1 END,
         day_window = CASE WHEN excluded.day_window > day_window THEN excluded.day_window ELSE day_window END,
         day_count = CASE WHEN excluded.day_window > day_window THEN 1 ELSE day_count + 1 END,
         last_seen_at = datetime('now')
       WHERE (CASE WHEN excluded.short_window > short_window THEN 1 ELSE short_count + 1 END) <= ?
         AND (CASE WHEN excluded.day_window > day_window THEN 1 ELSE day_count + 1 END) <= ?`,
    )
    .bind(key, shortWindow, dayWindow, MAX_SHORT_WINDOW_SUBMISSIONS, MAX_DAILY_SUBMISSIONS)
    .run();
  if (result.meta.changes === 0)
    throw new Error("Batas permintaan booking tercapai. Coba lagi nanti.");
}

export const bookingSubmissionLimits = {
  shortWindowSeconds: SHORT_WINDOW_SECONDS,
  maxShortWindowSubmissions: MAX_SHORT_WINDOW_SUBMISSIONS,
  maxDailySubmissions: MAX_DAILY_SUBMISSIONS,
};
