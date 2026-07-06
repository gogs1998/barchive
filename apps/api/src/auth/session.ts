/**
 * Opaque refresh-token sessions, stored in the `sessions` table.
 *
 * A session token is a random UUID (never a JWT). Sessions expire after 30 days
 * and are rotated on refresh: the old row is deleted and a fresh one inserted.
 */

import { first, run } from "../db";

export const REFRESH_TTL_DAYS = 30;

interface SessionRow {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
}

function expiryISO(): string {
  return new Date(Date.now() + REFRESH_TTL_DAYS * 86_400_000).toISOString();
}

/** Create a new session for `userId`; returns the opaque refresh token. */
export async function createSession(db: D1Database, userId: string): Promise<string> {
  const id = crypto.randomUUID();
  const token = crypto.randomUUID();
  await run(
    db,
    "INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)",
    id,
    userId,
    token,
    expiryISO(),
  );
  return token;
}

/** Delete a session by its token (no-op if absent). */
export async function revokeSession(db: D1Database, token: string): Promise<void> {
  await run(db, "DELETE FROM sessions WHERE token = ?", token);
}

/**
 * Rotate a refresh token: validate + delete the old session, then issue a new
 * one. Returns the new token, or null if the old token is missing/expired.
 */
export async function rotateSession(
  db: D1Database,
  oldToken: string,
): Promise<string | null> {
  const row = await first<SessionRow>(
    db,
    "SELECT id, user_id, token, expires_at FROM sessions WHERE token = ?",
    oldToken,
  );
  if (!row) return null;

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await revokeSession(db, oldToken);
    return null;
  }

  await revokeSession(db, oldToken);
  return createSession(db, row.user_id);
}
