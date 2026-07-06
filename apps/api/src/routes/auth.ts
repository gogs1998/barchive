/**
 * Email + password auth routes (`/api/v1/auth/*`).
 *
 * Access = short-lived HS256 JWT cookie; refresh = opaque rotating session
 * cookie. Ported from the FastAPI reference; cookies/status codes preserved,
 * with `login` canonicalized to return the user object and error bodies to `error`.
 */

import { Hono } from "hono";
import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import type { AppEnv } from "../env";
import { first, run } from "../db";
import { hashPassword, verifyPassword } from "../auth/password";
import { signAccess, signReset, verifyOfType } from "../auth/jwt";
import { createSession, rotateSession, revokeSession } from "../auth/session";
import { setAuthCookies, clearAuthCookies } from "../auth/cookies";
import { requireUser, requireSecret } from "../auth/middleware";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updatePassword,
  userOut,
} from "../users";

export const auth = new Hono<AppEnv>();

const MIN_PASSWORD_LEN = 8;

// A real PBKDF2 hash of a throwaway string. On login for a missing user (or one
// without a password_hash) we still run verifyPassword against this so the
// response time doesn't reveal whether an email exists (M1: timing enumeration).
// Computed once, lazily, and cached at module scope.
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) dummyHashPromise = hashPassword("timing-safe-dummy-password");
  return dummyHashPromise;
}

async function readJson(c: Context<AppEnv>): Promise<Record<string, unknown>> {
  try {
    return (await c.req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// POST /register
auth.post("/api/v1/auth/register", async (c) => {
  const body = await readJson(c);
  // Normalize to lowercase so the (case-insensitive) unique index and future
  // logins agree — otherwise `Foo@x.com` and `foo@x.com` become distinct rows (M2).
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const displayName =
    typeof body.displayName === "string" && body.displayName.trim()
      ? body.displayName.trim()
      : null;

  if (!email) return c.json({ error: "Email is required" }, 400);
  if (password.length < MIN_PASSWORD_LEN) {
    return c.json({ error: "Password must be at least 8 characters" }, 400);
  }

  const existing = await findUserByEmail(c.env.DB, email);
  if (existing) return c.json({ error: "Email already registered" }, 409);

  const hash = await hashPassword(password);
  let user;
  try {
    user = await createUser(c.env.DB, email, hash, displayName);
  } catch (e) {
    // A concurrent registration can win the race between the check above and this
    // INSERT; map the UNIQUE-constraint violation to 409 instead of a 500 (L6).
    if (e instanceof Error && /UNIQUE constraint/i.test(e.message)) {
      return c.json({ error: "Email already registered" }, 409);
    }
    throw e;
  }
  // Verification email is a no-op until Resend is configured; do NOT enforce.
  return c.json(userOut(user), 201);
});

// POST /login — returns the user object + sets cookies.
auth.post("/api/v1/auth/login", async (c) => {
  let secret: string;
  try {
    secret = requireSecret(c);
  } catch {
    return c.json({ error: "server_misconfigured" }, 500);
  }

  const body = await readJson(c);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  const user = await findUserByEmail(c.env.DB, email);
  // Always run PBKDF2 — against the real hash when present, otherwise a dummy —
  // so login timing is the same for existing vs non-existent emails (M1).
  const hashToCheck = user?.password_hash ?? (await getDummyHash());
  const passwordOk = await verifyPassword(password, hashToCheck);
  if (!user || !user.password_hash || !passwordOk) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const access = await signAccess(user.id, secret);
  const refresh = await createSession(c.env.DB, user.id);
  setAuthCookies(c, access, refresh);
  return c.json(userOut(user), 200);
});

// POST /refresh — rotate the refresh token, re-issue cookies.
auth.post("/api/v1/auth/refresh", async (c) => {
  let secret: string;
  try {
    secret = requireSecret(c);
  } catch {
    return c.json({ error: "server_misconfigured" }, 500);
  }

  const oldToken = getCookie(c, "refresh_token");
  if (!oldToken) return c.json({ error: "Missing refresh token" }, 401);

  const newToken = await rotateSession(c.env.DB, oldToken);
  if (!newToken) return c.json({ error: "Invalid or expired refresh token" }, 401);

  const row = await first<{ user_id: string }>(
    c.env.DB,
    "SELECT user_id FROM sessions WHERE token = ?",
    newToken,
  );
  if (!row) return c.json({ error: "Invalid or expired refresh token" }, 401);

  const access = await signAccess(row.user_id, secret);
  setAuthCookies(c, access, newToken);
  return c.json({ message: "Token refreshed" }, 200);
});

// POST /logout — revoke session + clear cookies.
auth.post("/api/v1/auth/logout", async (c) => {
  const refresh = getCookie(c, "refresh_token");
  if (refresh) await revokeSession(c.env.DB, refresh);
  clearAuthCookies(c);
  return c.json({ message: "Logged out" }, 200);
});

// POST /password-reset/request — always 200 (anti-enumeration).
auth.post("/api/v1/auth/password-reset/request", async (c) => {
  let secret: string;
  try {
    secret = requireSecret(c);
  } catch {
    return c.json({ error: "server_misconfigured" }, 500);
  }

  const body = await readJson(c);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const generic = { message: "If that email is registered, a reset link has been sent" };
  if (!email) return c.json(generic, 200);

  const found = await findUserByEmail(c.env.DB, email);
  if (found && found.password_hash) {
    const token = await signReset(found.id, secret);
    if (c.env.ENVIRONMENT === "development") {
      // Dev only — never log a working reset token in production, even when no
      // email provider is configured (M4). Prod without Resend simply no-ops.
      const origin = c.env.FRONTEND_ORIGIN || "";
      console.log(
        `[password-reset] no RESEND_API_KEY; reset link for ${email}: ` +
          `${origin}/auth/reset-password?token=${token}`,
      );
    }
    // (Real Resend delivery is deferred; endpoints are stubbed until keys exist.)
  }
  return c.json(generic, 200);
});

// POST /password-reset/confirm — set a new password with a valid reset token.
auth.post("/api/v1/auth/password-reset/confirm", async (c) => {
  let secret: string;
  try {
    secret = requireSecret(c);
  } catch {
    return c.json({ error: "server_misconfigured" }, 500);
  }

  const body = await readJson(c);
  const token = typeof body.token === "string" ? body.token : "";
  const newPassword = typeof body.new_password === "string" ? body.new_password : "";

  if (newPassword.length < MIN_PASSWORD_LEN) {
    return c.json({ error: "Password must be at least 8 characters" }, 400);
  }

  const payload = await verifyOfType(token, secret, "password_reset");
  if (!payload) return c.json({ error: "Invalid or expired reset token" }, 400);

  const found = await findUserById(c.env.DB, payload.sub);
  if (!found) return c.json({ error: "Invalid or expired reset token" }, 400);

  await updatePassword(c.env.DB, found.id, await hashPassword(newPassword));
  // Evict all existing refresh sessions so any stolen/leaked token that
  // prompted the reset can no longer be used (M3).
  await run(c.env.DB, "DELETE FROM sessions WHERE user_id = ?", found.id);
  return c.json({ message: "Password updated successfully" }, 200);
});

// GET /api/v1/auth/me — alias of /api/user/me.
auth.get("/api/v1/auth/me", requireUser, (c) => {
  return c.json(userOut(c.get("user")));
});
