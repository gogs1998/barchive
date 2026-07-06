/**
 * `requireUser` — Hono middleware that authenticates via the `access_token`
 * cookie and attaches the user to the request context. Responds 401 on any
 * missing/invalid token or unknown user. Fails 500 if JWT_SECRET is unset.
 */

import type { Context, MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import type { AppEnv, AuthUser } from "../env";
import { first } from "../db";
import { verifyOfType } from "./jwt";

/** Throw-if-missing accessor for the required JWT secret. */
export function requireSecret(c: Context<AppEnv>): string {
  const secret = c.env.JWT_SECRET;
  if (!secret || !secret.trim()) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
}

export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  let secret: string;
  try {
    secret = requireSecret(c);
  } catch {
    return c.json({ error: "server_misconfigured" }, 500);
  }

  const token = getCookie(c, "access_token");
  if (!token) return c.json({ error: "unauthorized" }, 401);

  const payload = await verifyOfType(token, secret, "access");
  if (!payload) return c.json({ error: "unauthorized" }, 401);

  const user = await first<AuthUser>(
    c.env.DB,
    "SELECT id, email, email_verified, display_name FROM users WHERE id = ?",
    payload.sub,
  );
  if (!user) return c.json({ error: "unauthorized" }, 401);

  c.set("user", user);
  await next();
};
