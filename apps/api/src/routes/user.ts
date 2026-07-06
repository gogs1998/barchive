/**
 * Canonical user routes (`/api/user/*`): profile, My Bar, Favourites.
 * All require a valid access cookie via `requireUser`.
 */

import { Hono } from "hono";
import type { AppEnv } from "../env";
import { requireUser } from "../auth/middleware";
import { userOut } from "../users";

export const user = new Hono<AppEnv>();

// GET /api/user/me
user.get("/api/user/me", requireUser, (c) => {
  return c.json(userOut(c.get("user")));
});
