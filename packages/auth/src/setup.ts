import type { D1Database, D1PreparedStatement } from "@cloudflare/workers-types";

const MIN_SETUP_TOKEN_LENGTH = 32;

/** Compare setup secrets without making an early length/content decision observable. */
export async function verifySetupToken(
  expected: string | undefined,
  supplied: string | undefined,
): Promise<boolean> {
  if (
    !expected ||
    !supplied ||
    expected.length < MIN_SETUP_TOKEN_LENGTH ||
    supplied.length > 4096
  ) {
    return false;
  }

  const encoder = new TextEncoder();
  const [expectedDigest, suppliedDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
    crypto.subtle.digest("SHA-256", encoder.encode(supplied)),
  ]);
  const expectedBytes = new Uint8Array(expectedDigest);
  const suppliedBytes = new Uint8Array(suppliedDigest);
  let difference = expected.length ^ supplied.length;
  for (let index = 0; index < expectedBytes.length; index += 1) {
    difference |= (expectedBytes[index] ?? 0) ^ (suppliedBytes[index] ?? 0);
  }
  return difference === 0;
}

export async function isSetupComplete(db: D1Database): Promise<boolean> {
  const result = await db
    .prepare(
      `SELECT (
        EXISTS(SELECT 1 FROM user WHERE role = 'admin')
        OR EXISTS(SELECT 1 FROM setup_state WHERE id = 1 AND status = 'complete')
      ) AS complete`,
    )
    .first<{ complete: number }>();

  return result?.complete === 1;
}

export async function claimSetup(db: D1Database): Promise<boolean> {
  await db
    .prepare(
      `DELETE FROM setup_state
       WHERE id = 1
         AND status = 'in_progress'
         AND createdAt < datetime('now', '-10 minutes')`,
    )
    .run();

  const result = await db
    .prepare(
      `INSERT INTO setup_state (id, status, createdAt)
       VALUES (1, 'in_progress', datetime('now'))
       ON CONFLICT(id) DO NOTHING`,
    )
    .run();

  return result.meta.changes === 1;
}

export async function completeSetup(db: D1Database, adminUserId: string): Promise<void> {
  await db.batch([
    db
      .prepare("UPDATE user SET role = 'admin', updatedAt = datetime('now') WHERE id = ?")
      .bind(adminUserId),
    db
      .prepare(
        `UPDATE setup_state
         SET status = 'complete', completedAt = datetime('now'), adminUserId = ?
         WHERE id = 1 AND status = 'in_progress'`,
      )
      .bind(adminUserId),
  ]);
}

export async function releaseSetupClaim(db: D1Database, createdUserId?: string): Promise<void> {
  const statements: D1PreparedStatement[] = [];

  if (createdUserId) {
    statements.push(
      db.prepare("DELETE FROM session WHERE userId = ?").bind(createdUserId),
      db.prepare("DELETE FROM account WHERE userId = ?").bind(createdUserId),
      db.prepare("DELETE FROM user WHERE id = ? AND role = 'customer'").bind(createdUserId),
    );
  }

  statements.push(db.prepare("DELETE FROM setup_state WHERE id = 1 AND status = 'in_progress'"));
  await db.batch(statements);
}
