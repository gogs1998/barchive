/**
 * Canonical user routes (`/api/user/*`): profile, My Bar, Favourites.
 * All require a valid access cookie via `requireUser`.
 *
 * Ingredient identity is the public **slug**: the API accepts/returns slugs and
 * resolves them to the internal ingredient UUID via `ingredients.slug`.
 * Cocktails already carry a slug.
 */

import { Hono } from "hono";
import type { AppEnv } from "../env";
import { requireUser } from "../auth/middleware";
import { userOut } from "../users";
import { first, all, run } from "../db";

export const user = new Hono<AppEnv>();

// GET /api/user/me
user.get("/api/user/me", requireUser, (c) => {
  return c.json(userOut(c.get("user")));
});

// ── My Bar ──────────────────────────────────────────────────────────────────

// GET /api/user/bar → { items:[{id(slug),name,category,description}], total }
user.get("/api/user/bar", requireUser, async (c) => {
  const userId = c.get("user").id;
  const items = await all(
    c.env.DB,
    `SELECT i.slug AS id, i.name, i.category, i.description
     FROM user_bar ub
     JOIN ingredients i ON i.id = ub.ingredient_id
     WHERE ub.user_id = ?
     ORDER BY i.name`,
    userId,
  );
  return c.json({ items, total: items.length });
});

// POST /api/user/bar/{slug} → 204 idempotent; 404 unknown ingredient.
user.post("/api/user/bar/:slug", requireUser, async (c) => {
  const userId = c.get("user").id;
  const ingredient = await first<{ id: string }>(
    c.env.DB,
    "SELECT id FROM ingredients WHERE slug = ?",
    c.req.param("slug"),
  );
  if (!ingredient) return c.json({ error: "Ingredient not found" }, 404);

  await run(
    c.env.DB,
    "INSERT OR IGNORE INTO user_bar (user_id, ingredient_id) VALUES (?, ?)",
    userId,
    ingredient.id,
  );
  return c.body(null, 204);
});

// DELETE /api/user/bar/{slug} → 204; 404 if not in bar.
user.delete("/api/user/bar/:slug", requireUser, async (c) => {
  const userId = c.get("user").id;
  const ingredient = await first<{ id: string }>(
    c.env.DB,
    "SELECT id FROM ingredients WHERE slug = ?",
    c.req.param("slug"),
  );
  if (!ingredient) return c.json({ error: "Ingredient not in your bar" }, 404);

  const res = await run(
    c.env.DB,
    "DELETE FROM user_bar WHERE user_id = ? AND ingredient_id = ?",
    userId,
    ingredient.id,
  );
  if (res.meta.changes === 0) return c.json({ error: "Ingredient not in your bar" }, 404);
  return c.body(null, 204);
});

// ── Favourites ──────────────────────────────────────────────────────────────

interface CocktailRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  method: string | null;
  garnish: string | null;
  glassware: string | null;
}

async function cocktailCard(db: D1Database, row: CocktailRow) {
  const ingredients = await all(
    db,
    `SELECT i.id AS ingredient_id, i.name, i.category, ci.quantity, ci.unit, ci.notes
     FROM cocktail_ingredients ci
     JOIN ingredients i ON i.id = ci.ingredient_id
     WHERE ci.cocktail_id = ?`,
    row.id,
  );
  const tags = await all(
    db,
    `SELECT t.id, t.name FROM cocktail_tags ct
     JOIN tags t ON t.id = ct.tag_id
     WHERE ct.cocktail_id = ?`,
    row.id,
  );
  return { ...row, isFavourited: true, ingredients, tags };
}

// GET /api/user/favourites → Cocktail[] (full cards).
user.get("/api/user/favourites", requireUser, async (c) => {
  const userId = c.get("user").id;
  const rows = await all<CocktailRow>(
    c.env.DB,
    `SELECT c.id, c.name, c.slug, c.description, c.method, c.garnish, c.glassware
     FROM user_favourites uf
     JOIN cocktails c ON c.id = uf.recipe_id
     WHERE uf.user_id = ?
     ORDER BY uf.created_at DESC`,
    userId,
  );
  const cards = await Promise.all(rows.map((r) => cocktailCard(c.env.DB, r)));
  return c.json(cards);
});

// POST /api/user/favourites/{slug} → 204 idempotent; 404 unknown cocktail.
user.post("/api/user/favourites/:slug", requireUser, async (c) => {
  const userId = c.get("user").id;
  const cocktail = await first<{ id: string }>(
    c.env.DB,
    "SELECT id FROM cocktails WHERE slug = ?",
    c.req.param("slug"),
  );
  if (!cocktail) return c.json({ error: "Recipe not found" }, 404);

  await run(
    c.env.DB,
    "INSERT OR IGNORE INTO user_favourites (user_id, recipe_id) VALUES (?, ?)",
    userId,
    cocktail.id,
  );
  return c.body(null, 204);
});

// DELETE /api/user/favourites/{slug} → 204 idempotent.
user.delete("/api/user/favourites/:slug", requireUser, async (c) => {
  const userId = c.get("user").id;
  const cocktail = await first<{ id: string }>(
    c.env.DB,
    "SELECT id FROM cocktails WHERE slug = ?",
    c.req.param("slug"),
  );
  if (cocktail) {
    await run(
      c.env.DB,
      "DELETE FROM user_favourites WHERE user_id = ? AND recipe_id = ?",
      userId,
      cocktail.id,
    );
  }
  return c.body(null, 204);
});
