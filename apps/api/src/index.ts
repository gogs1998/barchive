/**
 * BarIQ API — Cloudflare Worker (TypeScript / Hono) entry point.
 *
 * Ported from the Python/Pyodide Worker (`src/worker.py`, kept for reference).
 * Adds email+password auth, My Bar, and Favourites on the same D1 database.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv } from "./env";
import { catalog } from "./routes/catalog";
import { auth } from "./routes/auth";
import { user } from "./routes/user";

export type { Env } from "./env";

const app = new Hono<AppEnv>();

function allowedOrigins(frontendOrigin: string | undefined): string[] {
  return (frontendOrigin || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

// Credentialed CORS — reflect the request origin only when it's allowed
// (never `*` with credentials).
app.use("*", (c, next) => {
  const allowed = allowedOrigins(c.env.FRONTEND_ORIGIN);
  const requestOrigin = c.req.header("Origin");
  const origin = requestOrigin && allowed.includes(requestOrigin) ? requestOrigin : allowed[0];
  return cors({
    origin,
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Accept"],
  })(c, next);
});

// CSRF defence in depth (NEW-3): browsers send Origin on cross-site writes, so
// refuse state-changing requests from any origin we don't serve. Requests with
// no Origin (curl, server-to-server) carry no ambient cookies from a victim.
app.use("*", async (c, next) => {
  const method = c.req.method;
  if (method === "POST" || method === "PUT" || method === "DELETE") {
    const requestOrigin = c.req.header("Origin");
    if (requestOrigin && !allowedOrigins(c.env.FRONTEND_ORIGIN).includes(requestOrigin)) {
      return c.json({ error: "Origin not allowed" }, 403);
    }
  }
  return next();
});

// Throttle auth writes per client IP (NEW-2). Each login/register runs a 600k
// PBKDF2, so unthrottled calls are both credential stuffing and CPU burn.
app.use("/api/v1/auth/*", async (c, next) => {
  if (c.req.method === "POST" && c.env.AUTH_LIMITER) {
    const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
    const { success } = await c.env.AUTH_LIMITER.limit({ key: ip });
    if (!success) return c.json({ error: "Too many attempts. Try again in a minute." }, 429);
  }
  return next();
});

app.get("/health", async (c) => {
  let ok = true;
  try {
    await c.env.DB.prepare("SELECT 1 AS ok").first();
  } catch {
    ok = false; // don't echo internal DB errors (NEW-4)
  }
  return c.json({ status: ok ? "ok" : "degraded", db: ok ? "ok" : "error" });
});

// Mount routers
app.route("/", catalog);
app.route("/", auth);
app.route("/", user);

export default app;
