/**
 * Catalog routes — read-only GETs ported 1:1 from the Python Worker
 * (`src/worker.py`). Same response shapes; now typed and backed by `db.ts`.
 */

import { Hono } from "hono";
import type { AppEnv } from "../env";
import { first, all } from "../db";

export const catalog = new Hono<AppEnv>();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parsePage(raw: string | undefined, fallback: number): number {
  const n = raw === undefined || raw === "" ? fallback : Number(raw);
  if (!Number.isInteger(n)) return NaN;
  return Math.max(1, n);
}

function parsePerPage(raw: string | undefined, fallback: number, max: number): number {
  const n = raw === undefined || raw === "" ? fallback : Number(raw);
  if (!Number.isInteger(n)) return NaN;
  return Math.min(max, Math.max(1, n));
}

// GET /api/v1/cocktails[?q=&page=&per_page=]
catalog.get("/api/v1/cocktails", async (c) => {
  const q = c.req.query("q") ?? "";
  const page = parsePage(c.req.query("page"), 1);
  const perPage = parsePerPage(c.req.query("per_page"), 20, 100);
  if (Number.isNaN(page) || Number.isNaN(perPage)) {
    return c.json({ error: "Invalid pagination parameters" }, 422);
  }
  const offset = (page - 1) * perPage;

  const cols =
    "id, name, slug, description, method, garnish, glassware FROM cocktails";
  let total: number;
  let items: unknown[];
  if (q) {
    const pattern = `%${q}%`;
    const countRow = await first<{ cnt: number }>(
      c.env.DB,
      "SELECT COUNT(*) AS cnt FROM cocktails WHERE name LIKE ? COLLATE NOCASE",
      pattern,
    );
    total = countRow?.cnt ?? 0;
    items = await all(
      c.env.DB,
      `SELECT ${cols} WHERE name LIKE ? COLLATE NOCASE ORDER BY name LIMIT ? OFFSET ?`,
      pattern,
      perPage,
      offset,
    );
  } else {
    const countRow = await first<{ cnt: number }>(
      c.env.DB,
      "SELECT COUNT(*) AS cnt FROM cocktails",
    );
    total = countRow?.cnt ?? 0;
    items = await all(
      c.env.DB,
      `SELECT ${cols} ORDER BY name LIMIT ? OFFSET ?`,
      perPage,
      offset,
    );
  }
  return c.json({ total, page, per_page: perPage, items });
});

// GET /api/v1/cocktails/{slug}
catalog.get("/api/v1/cocktails/:slug", async (c) => {
  const slug = c.req.param("slug");
  const cocktail = await first<Record<string, unknown>>(
    c.env.DB,
    "SELECT id, name, slug, description, method, garnish, glassware FROM cocktails WHERE slug = ?",
    slug,
  );
  if (!cocktail) return c.json({ error: "Cocktail not found" }, 404);

  const cocktailId = cocktail.id as string;
  const ingredients = await all(
    c.env.DB,
    `SELECT i.id AS ingredient_id, i.name, i.category,
            ci.quantity, ci.unit, ci.notes, ci.quantity_num, ci.unit_norm
     FROM cocktail_ingredients ci
     JOIN ingredients i ON i.id = ci.ingredient_id
     WHERE ci.cocktail_id = ?`,
    cocktailId,
  );
  const tags = await all(
    c.env.DB,
    `SELECT t.id, t.name
     FROM cocktail_tags ct
     JOIN tags t ON t.id = ct.tag_id
     WHERE ct.cocktail_id = ?`,
    cocktailId,
  );

  return c.json({ ...cocktail, ingredients, tags });
});

// GET /api/v1/ingredients[?category=&page=&per_page=]
catalog.get("/api/v1/ingredients", async (c) => {
  const category = c.req.query("category") ?? "";
  const page = parsePage(c.req.query("page"), 1);
  const perPage = parsePerPage(c.req.query("per_page"), 50, 200);
  if (Number.isNaN(page) || Number.isNaN(perPage)) {
    return c.json({ error: "Invalid pagination parameters" }, 422);
  }
  const offset = (page - 1) * perPage;

  let total: number;
  let items: unknown[];
  if (category) {
    const countRow = await first<{ cnt: number }>(
      c.env.DB,
      "SELECT COUNT(*) AS cnt FROM ingredients WHERE category = ?",
      category,
    );
    total = countRow?.cnt ?? 0;
    items = await all(
      c.env.DB,
      "SELECT id, name, category, description FROM ingredients WHERE category = ? ORDER BY name LIMIT ? OFFSET ?",
      category,
      perPage,
      offset,
    );
  } else {
    const countRow = await first<{ cnt: number }>(
      c.env.DB,
      "SELECT COUNT(*) AS cnt FROM ingredients",
    );
    total = countRow?.cnt ?? 0;
    items = await all(
      c.env.DB,
      "SELECT id, name, category, description FROM ingredients ORDER BY name LIMIT ? OFFSET ?",
      perPage,
      offset,
    );
  }
  return c.json({ total, page, per_page: perPage, items });
});

// GET /api/v1/ingredients/{id}
catalog.get("/api/v1/ingredients/:id", async (c) => {
  const id = c.req.param("id");
  if (!UUID_RE.test(id)) return c.json({ error: "Invalid UUID" }, 422);
  const row = await first(
    c.env.DB,
    "SELECT id, name, category, description FROM ingredients WHERE id = ?",
    id,
  );
  if (!row) return c.json({ error: "Ingredient not found" }, 404);
  return c.json(row);
});
