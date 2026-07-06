/**
 * BarIQ API — Cloudflare Worker (TypeScript / Hono) entry point.
 *
 * Ported from the Python/Pyodide Worker (`src/worker.py`, kept for reference).
 * Adds email+password auth, My Bar, and Favourites on the same D1 database.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ENVIRONMENT: string;
  FRONTEND_ORIGIN: string;
}

export type AppContext = { Bindings: Env };

const app = new Hono<AppContext>();

// Credentialed CORS — reflect the specific frontend origin (never `*` with
// credentials). Falls back to the configured FRONTEND_ORIGIN.
app.use("*", (c, next) => {
  const allowed = c.env.FRONTEND_ORIGIN || "http://localhost:3000";
  const requestOrigin = c.req.header("Origin");
  const origin = requestOrigin === allowed ? requestOrigin : allowed;
  return cors({
    origin,
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Accept"],
  })(c, next);
});

app.get("/health", async (c) => {
  let db = "ok";
  try {
    await c.env.DB.prepare("SELECT 1 AS ok").first();
  } catch (err) {
    db = `error: ${err instanceof Error ? err.message : String(err)}`;
  }
  return c.json({ status: db === "ok" ? "ok" : "degraded", db });
});

export default app;
