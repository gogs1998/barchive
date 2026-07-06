/**
 * Auth cookie helpers.
 *
 * Both tokens are httpOnly + SameSite=Lax, Secure outside development. The
 * refresh cookie is scoped to the refresh endpoint path so it's only sent there.
 */

import type { Context } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import type { AppEnv } from "../env";
import { ACCESS_TTL_SECONDS } from "./jwt";
import { REFRESH_TTL_DAYS } from "./session";

const REFRESH_PATH = "/api/v1/auth/refresh";
const REFRESH_MAX_AGE = REFRESH_TTL_DAYS * 86_400; // 2_592_000

function isSecure(c: Context<AppEnv>): boolean {
  return c.env.ENVIRONMENT !== "development";
}

export function setAuthCookies(
  c: Context<AppEnv>,
  accessJwt: string,
  refreshToken: string,
): void {
  const secure = isSecure(c);
  // L4: if the API and web app ever live on different registrable domains in
  // prod, these cookies must become SameSite=None; Secure to be sent cross-site.
  setCookie(c, "access_token", accessJwt, {
    httpOnly: true,
    secure,
    sameSite: "Lax",
    path: "/",
    maxAge: ACCESS_TTL_SECONDS,
  });
  setCookie(c, "refresh_token", refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "Lax",
    path: REFRESH_PATH,
    maxAge: REFRESH_MAX_AGE,
  });
}

export function clearAuthCookies(c: Context<AppEnv>): void {
  deleteCookie(c, "access_token", { path: "/" });
  deleteCookie(c, "refresh_token", { path: REFRESH_PATH });
}
