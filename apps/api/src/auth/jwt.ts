/**
 * HS256 JWT helpers, built on `hono/jwt`.
 *
 * Token types:
 *  - `access`         — short-lived (30 min) API access token.
 *  - `password_reset` — 1h token used by password-reset/confirm.
 *
 * `JWT_SECRET` is always supplied by the caller (from env) — never defaulted.
 */

import { sign, verify } from "hono/jwt";

export type TokenType = "access" | "password_reset";

export const ACCESS_TTL_SECONDS = 30 * 60; // 30 min
export const RESET_TTL_SECONDS = 60 * 60; // 1 h

export interface TokenPayload {
  sub: string;
  type: TokenType;
  exp: number;
  [key: string]: unknown;
}

/** Sign a token with `{sub, type, exp}`; `ttlSeconds` is relative to now. */
export async function signToken(
  data: { sub: string; type: TokenType },
  secret: string,
  ttlSeconds: number,
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return sign({ sub: data.sub, type: data.type, exp }, secret, "HS256");
}

/** Verify a token's signature + expiry. Returns the payload, or null. */
export async function verifyToken(
  token: string,
  secret: string,
): Promise<TokenPayload | null> {
  try {
    const payload = (await verify(token, secret, "HS256")) as TokenPayload;
    // hono only checks `exp` when present; every token we sign has one, so a
    // token without it is not ours (NEW-4).
    if (typeof payload.exp !== "number") return null;
    return payload;
  } catch {
    return null;
  }
}

/** Verify a token and require a specific `type`. Returns payload, or null. */
export async function verifyOfType(
  token: string,
  secret: string,
  type: TokenType,
): Promise<TokenPayload | null> {
  const payload = await verifyToken(token, secret);
  if (!payload || payload.type !== type) return null;
  return payload;
}

export function signAccess(userId: string, secret: string): Promise<string> {
  return signToken({ sub: userId, type: "access" }, secret, ACCESS_TTL_SECONDS);
}

export function signReset(userId: string, secret: string): Promise<string> {
  return signToken({ sub: userId, type: "password_reset" }, secret, RESET_TTL_SECONDS);
}
