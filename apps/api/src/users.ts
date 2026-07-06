/** User table row shape + public serialization + small DB helpers. */

import { first, run } from "./db";

export interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  email_verified: number;
  display_name: string | null;
}

export interface UserOut {
  id: string;
  email: string;
  email_verified: boolean;
  display_name: string | null;
}

/** Public representation returned by the API (email_verified as a boolean). */
export function userOut(u: {
  id: string;
  email: string;
  email_verified: number;
  display_name: string | null;
}): UserOut {
  return {
    id: u.id,
    email: u.email,
    email_verified: !!u.email_verified,
    display_name: u.display_name ?? null,
  };
}

export function findUserByEmail(db: D1Database, email: string): Promise<UserRow | null> {
  return first<UserRow>(
    db,
    "SELECT id, email, password_hash, email_verified, display_name FROM users WHERE email = ?",
    email,
  );
}

export function findUserById(db: D1Database, id: string): Promise<UserRow | null> {
  return first<UserRow>(
    db,
    "SELECT id, email, password_hash, email_verified, display_name FROM users WHERE id = ?",
    id,
  );
}

export async function createUser(
  db: D1Database,
  email: string,
  passwordHash: string,
  displayName: string | null,
): Promise<UserRow> {
  const id = crypto.randomUUID();
  await run(
    db,
    "INSERT INTO users (id, email, password_hash, email_verified, display_name) VALUES (?, ?, ?, 0, ?)",
    id,
    email,
    passwordHash,
    displayName,
  );
  return { id, email, password_hash: passwordHash, email_verified: 0, display_name: displayName };
}

export async function updatePassword(
  db: D1Database,
  userId: string,
  passwordHash: string,
): Promise<void> {
  await run(db, "UPDATE users SET password_hash = ? WHERE id = ?", passwordHash, userId);
}
