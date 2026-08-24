import { Database } from "bun:sqlite";
import { describe, expect, it, vi } from "vitest";
import {
  bookingSubmissionLimits,
  consumeBookingQuota,
  daysBetweenIso,
  isCanonicalIsoDate,
  submissionFingerprint,
  verifyTurnstile,
} from "./submission-security";

function sqliteD1() {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE booking_submission_limits (
      client_key TEXT PRIMARY KEY,
      short_window INTEGER NOT NULL,
      short_count INTEGER NOT NULL CHECK (short_count BETWEEN 1 AND 5),
      day_window TEXT NOT NULL,
      day_count INTEGER NOT NULL CHECK (day_count BETWEEN 1 AND 20),
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return {
    prepare(sql: string) {
      const execute = async (bindings: unknown[] = []) => {
        const result = sqlite.query(sql).run(...(bindings as never[]));
        return { meta: { changes: result.changes } };
      };
      return {
        run: () => execute(),
        bind: (...bindings: unknown[]) => ({ run: () => execute(bindings) }),
      };
    },
    close: () => sqlite.close(),
  };
}

describe("booking submission security", () => {
  it("accepts only real calendar dates", () => {
    expect(isCanonicalIsoDate("2026-02-28")).toBe(true);
    expect(isCanonicalIsoDate("2026-02-30")).toBe(false);
    expect(daysBetweenIso("2026-02-28", "2026-03-01")).toBe(1);
  });

  it("fails closed and verifies action plus hostname", async () => {
    const env = {
      TURNSTILE_SITE_KEY: "site-key",
      TURNSTILE_SECRET: "secret",
      TURNSTILE_HOSTNAMES: "localhost,shop.example",
    } as never;
    await expect(verifyTurnstile({} as never, "token", "127.0.0.1")).resolves.toBe(false);

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, action: "booking", hostname: "shop.example" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(verifyTurnstile(env, "token", "127.0.0.1")).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("keeps the published abuse budget explicit", () => {
    expect(bookingSubmissionLimits).toEqual({
      shortWindowSeconds: 900,
      maxShortWindowSubmissions: 5,
      maxDailySubmissions: 20,
    });
  });

  it("normalizes contact formatting within a fingerprint bucket", async () => {
    const base = {
      itemId: 4,
      mode: "range",
      startDate: "2026-09-01",
      endDate: "2026-09-03",
      slotId: null,
      customerName: "  Ada   Lovelace ",
      customerPhone: "+62 (812) 345-678",
      customerEmail: " ADA@EXAMPLE.TEST ",
      serviceAddress: "  Jalan   Contoh 1 ",
      note: "  Call   first ",
    };
    const equivalent = {
      ...base,
      customerName: "Ada Lovelace",
      customerPhone: "62812345678",
      customerEmail: "ada@example.test",
      serviceAddress: "Jalan Contoh 1",
      note: "Call first",
    };
    await expect(submissionFingerprint("secret", "client", 10, base)).resolves.toBe(
      await submissionFingerprint("secret", "client", 10, equivalent),
    );
  });

  it("rejects the sixth request in a window without affecting another client", async () => {
    const db = sqliteD1();
    const now = new Date("2026-08-24T10:00:00Z");
    try {
      for (let index = 0; index < 5; index += 1) {
        await consumeBookingQuota(db as never, "client-a", now);
      }
      await expect(consumeBookingQuota(db as never, "client-a", now)).rejects.toThrow(
        /Batas permintaan/,
      );
      await expect(consumeBookingQuota(db as never, "client-b", now)).resolves.toBeUndefined();
    } finally {
      db.close();
    }
  });

  it("rejects the twenty-first request in one day even when each window changes", async () => {
    const db = sqliteD1();
    const first = Date.parse("2026-08-24T00:00:00Z");
    try {
      for (let index = 0; index < 20; index += 1) {
        await consumeBookingQuota(db as never, "client-a", new Date(first + index * 900_000));
      }
      await expect(
        consumeBookingQuota(db as never, "client-a", new Date(first + 20 * 900_000)),
      ).rejects.toThrow(/Batas permintaan/);
    } finally {
      db.close();
    }
  });
});
